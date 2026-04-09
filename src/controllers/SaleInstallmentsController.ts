// src/controllers/VentaAbonosController.ts
// Endpoints de abonos por venta — se montan en /api/ventas/:id/...
import { Request, Response } from "express";
import { AppDataSource }     from "../data-source";
import { Sale }             from "../models/Sale";
import { Payment }              from "../models/Payment";
import { PaymentStatus }        from "../models/PaymentStatus";
import { PaymentMethod }        from "../models/PaymentMethod";
import { calculateInstallments, nextInstallment } from "../helpers/installments.helper";

// ── GET /api/ventas/:id/estado-pagos ─────────────────────────────────────────
// Devuelve el estado actual de abonos: cuántos hay, cuánto falta, qué sigue
export const getPaymentPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_venta = Number(req.params.id)

    const venta = await AppDataSource.getRepository(Sale).findOne({
      where:     { id_venta },
      relations: ["payments", "pagos.paymentStatus"],
    })
    if (!venta) { res.status(404).json({ success: false, message: "Venta no encontrada" }); return }

    const { total, num_abonos, porcentaje_primer_abono } = venta
    // Orden determinista: siempre id_pago ASC para que historial_pagos[n-1] coincida con abono n
    const pagosOrdenados  = [...venta.payments].sort((a, b) => a.id_pago - b.id_pago)
    const pagosRealizados = pagosOrdenados.length
    const totalPagado     = pagosOrdenados.reduce((s, p) => s + Number(p.monto), 0)
    const saldo           = Math.round((Number(total) - totalPagado) * 100) / 100
    const abonos          = calculateInstallments(Number(total), num_abonos, porcentaje_primer_abono)
    const siguiente       = nextInstallment(Number(total), num_abonos, porcentaje_primer_abono, pagosRealizados)

    res.json({
      success: true,
      data: {
        id_venta,
        total:             Number(total),
        num_abonos,
        porcentaje_primer_abono,
        pagos_realizados:  pagosRealizados,
        total_pagado:      Math.round(totalPagado * 100) / 100,
        saldo_pendiente:   saldo,
        completado:        saldo <= 0,
        plan_abonos:       abonos,
        siguiente_abono:   siguiente,
        historial_pagos:   pagosOrdenados.map(p => ({
          id_pago:   p.id_pago,
          monto:     Number(p.monto),
          fecha:     p.fecha,
          estado:    p.paymentStatus?.nombre ?? "—",
        })),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener estado de pagos", error })
  }
}

// ── POST /api/ventas/:id/abono ────────────────────────────────────────────────
// Registra el siguiente abono con validación de monto
// Body: { monto, id_metodo_pago, fecha?, tolerancia? }
export const registerInstallment = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_venta = Number(req.params.id)
    const { monto, id_metodo_pago, fecha, tolerancia = 1 } = req.body
    // tolerancia: margen de error permitido en pesos (default $1 para redondeos)

    if (!monto || !id_metodo_pago) {
      res.status(400).json({ success: false, message: "monto e id_metodo_pago son requeridos" }); return
    }

    const ventaRepo = AppDataSource.getRepository(Sale)
    const venta     = await ventaRepo.findOne({
      where:     { id_venta },
      relations: ["payments"],
    })
    if (!venta) { res.status(404).json({ success: false, message: "Venta no encontrada" }); return }

    const pagosRealizados = venta.payments.length
    const { total, num_abonos, porcentaje_primer_abono } = venta

    // Verificar que no se hayan completado todos los abonos
    if (pagosRealizados >= num_abonos) {
      res.status(409).json({
        success: false,
        message: `Esta venta ya tiene ${num_abonos} abono(s) registrado(s). No se pueden agregar más.`,
      }); return
    }

    // Calcular monto esperado para este abono
    const siguiente = nextInstallment(Number(total), num_abonos, porcentaje_primer_abono, pagosRealizados)
    if (!siguiente) {
      res.status(409).json({ success: false, message: "No hay abonos pendientes para esta venta" }); return
    }

    const montoEnviado  = Number(monto)
    const montoEsperado = siguiente.montoEsperado
    const diferencia    = Math.abs(montoEnviado - montoEsperado)

    // Para el último abono: monto debe ser exacto (± tolerancia)
    // Para abonos intermedios: monto mínimo = montoEsperado (no puede pagar menos)
    if (siguiente.esUltimo) {
      if (diferencia > tolerancia) {
        res.status(400).json({
          success: false,
          message: `El último abono debe ser de $${montoEsperado.toLocaleString("es-CO")} (saldo exacto). Recibido: $${montoEnviado.toLocaleString("es-CO")}`,
          data: { monto_esperado: montoEsperado, monto_recibido: montoEnviado, diferencia },
        }); return
      }
    } else {
      if (montoEnviado < montoEsperado - tolerancia) {
        res.status(400).json({
          success: false,
          message: `El abono #${siguiente.numero} debe ser de al menos $${montoEsperado.toLocaleString("es-CO")}. Recibido: $${montoEnviado.toLocaleString("es-CO")}`,
          data: { monto_esperado: montoEsperado, monto_recibido: montoEnviado },
        }); return
      }
    }

    // Buscar estado "Validado" para el nuevo pago
    const estadoPendiente = await AppDataSource.getRepository(PaymentStatus)
      .createQueryBuilder("ep")
      .where("LOWER(ep.nombre) LIKE :n", { n: "%validado%" })
      .getOne()

    const metodo = await AppDataSource.getRepository(PaymentMethod)
      .findOneBy({ id_metodo_pago: Number(id_metodo_pago) })
    if (!metodo) {
      res.status(404).json({ success: false, message: "Método de pago no encontrado" }); return
    }

    const pagoRepo = AppDataSource.getRepository(Payment)
    const pago     = pagoRepo.create()
    pago.sale     = venta
    pago.monto     = montoEnviado
    pago.fecha     = fecha ? new Date(fecha) : new Date()
    pago.paymentMethod  = metodo
    if (estadoPendiente) pago.paymentStatus = estadoPendiente

    await pagoRepo.save(pago)

    const nuevoPagosRealizados = pagosRealizados + 1
    const completado           = nuevoPagosRealizados >= num_abonos

    // Si se completaron todos los abonos → activar estado de la venta
    // Usar update() en lugar de save() para no tocar relaciones no cargadas (ej: cita)
    if (completado) {
      await AppDataSource.getRepository(Sale).update({ id_venta }, { estado: true })
    }
    const totalPagado          = venta.payments.reduce((s, p) => s + Number(p.monto), 0) + montoEnviado
    const saldo                = Math.round((Number(total) - totalPagado) * 100) / 100

    res.status(201).json({
      success: true,
      message: completado
        ? "✅ Último abono registrado. Venta completamente pagada."
        : `Abono #${siguiente.numero} de ${num_abonos} registrado. Saldo pendiente: $${saldo.toLocaleString("es-CO")}`,
      data: {
        id_pago:          pago.id_pago,
        abono_numero:     siguiente.numero,
        monto:            montoEnviado,
        total_pagado:     totalPagado,
        saldo_pendiente:  saldo,
        completado,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al registrar abono", error })
  }
}

// ── PATCH /api/ventas/:id/configurar-abonos ───────────────────────────────────
// Permite cambiar num_abonos y porcentaje_primer_abono SOLO si no hay pagos aún
export const configureInstallments = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_venta = Number(req.params.id)
    const { num_abonos, porcentaje_primer_abono } = req.body

    const ventaRepo = AppDataSource.getRepository(Sale)
    const venta     = await ventaRepo.findOne({
      where:     { id_venta },
      relations: ["payments"],
    })
    if (!venta) { res.status(404).json({ success: false, message: "Venta no encontrada" }); return }

    if (venta.payments.length > 0) {
      res.status(409).json({
        success: false,
        message: "No se puede cambiar la configuración de abonos: ya hay pagos registrados.",
      }); return
    }

    if (num_abonos !== undefined) {
      const n = Number(num_abonos)
      if (n < 1 || n > 12) {
        res.status(400).json({ success: false, message: "num_abonos debe estar entre 1 y 12" }); return
      }
      venta.num_abonos = n
    }

    if (porcentaje_primer_abono !== undefined) {
      const p = Number(porcentaje_primer_abono)
      if (p < 1 || p > 99) {
        res.status(400).json({ success: false, message: "porcentaje_primer_abono debe estar entre 1 y 99" }); return
      }
      venta.porcentaje_primer_abono = p
    }

    await ventaRepo.save(venta)

    const abonos = calculateInstallments(Number(venta.total), venta.num_abonos, venta.porcentaje_primer_abono)
    res.json({
      success: true,
      message: "Configuración de abonos actualizada",
      data: { num_abonos: venta.num_abonos, porcentaje_primer_abono: venta.porcentaje_primer_abono, plan_abonos: abonos },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al configurar abonos", error })
  }
}