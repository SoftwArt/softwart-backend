// ─────────────────────────────────────────────────────────────────────────────
//  DetalleVentaController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { SaleDetail } from "../models/SaleDetail";
import { ServiceStatusHistory } from "../models/ServiceStatusHistory";
import { Sale } from "../models/Sale";
import { Service } from "../models/Service";
import { ServiceStatus } from "../models/ServiceStatus";
import { Frame } from "../models/Frame";
import { logServiceStatusChange } from "../helpers/serviceStatusHistory.helper";
import { guardEstadoTerminal, transicionUnicaPermitida } from "../helpers/statusTransition.helper";
import { coincideConCentavos, sumaServiciosVenta, msgTotalNoCoincide } from "../helpers/saleTotal.helper";
import { saleHasValidatedPayments, voidSaleCascade, isLastActiveDetail } from "../helpers/saleCascade.helper";

const SALE_RELATIONS = ["sale.saleDetails", "sale.saleDetails.serviceStatus", "sale.payments", "sale.payments.paymentStatus"];

export const getAllSaleDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo = AppDataSource.getRepository(SaleDetail);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await detalleVentaRepo.findAndCount({
      relations: ["sale", "sale.client", "service", "serviceStatus", "frame"],
      skip,
      take: limit,
    });

    res.json({
      success: true,
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener DetalleVenta", error });
  }
};

export const getSaleDetailById = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo = AppDataSource.getRepository(SaleDetail);
    const item = await detalleVentaRepo.findOne({
      where: { id_detalle: Number(req.params.id) },
      relations: ["sale", "sale.client", "service", "serviceStatus", "frame", ...SALE_RELATIONS],
    });
    if (!item) { res.status(404).json({ success: false, message: "DetalleVenta no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener DetalleVenta", error });
  }
};

export const createSaleDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo = AppDataSource.getRepository(SaleDetail);
    const required = ["fecha", "precio"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
    const obj = detalleVentaRepo.create();
    obj.fecha       = req.body.fecha;
    obj.observacion = req.body.observacion;
    obj.precio      = req.body.precio;
    obj.estado      = req.body.estado !== undefined ? req.body.estado : true;

    // id_venta e id_servicio son obligatorios (createSaleDetailSchema).
    const ventaRel = await AppDataSource.getRepository(Sale).findOneBy({ id_venta: Number(req.body.id_venta) });
    if (!ventaRel) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
    obj.sale = ventaRel;

    const servicioRel = await AppDataSource.getRepository(Service).findOneBy({ id_servicio: Number(req.body.id_servicio) });
    if (!servicioRel) { res.status(404).json({ success: false, message: "Servicio no encontrado" }); return; }
    obj.service = servicioRel;

    if (req.body.id_estado !== undefined) {
      const rel = await AppDataSource.getRepository(ServiceStatus).findOneBy({ id_estado: Number(req.body.id_estado) });
      if (!rel) { res.status(404).json({ success: false, message: "EstadoServicio no encontrado" }); return; }
      obj.serviceStatus = rel;
    }
    if (req.body.id_marco !== undefined) {
      if (req.body.id_marco === null) {
        obj.frame = null;
      } else {
        const rel = await AppDataSource.getRepository(Frame).findOneBy({ id_marco: Number(req.body.id_marco) });
        if (!rel) { res.status(404).json({ success: false, message: "Marco no encontrado" }); return; }
        obj.frame = rel;
      }
    }
    await detalleVentaRepo.save(obj);
    if (obj.serviceStatus) await logServiceStatusChange(AppDataSource.manager, obj, obj.serviceStatus);
    res.status(201).json({ success: true, message: "DetalleVenta creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear DetalleVenta", error });
  }
};

export const updateSaleDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo = AppDataSource.getRepository(SaleDetail);
    const item = await detalleVentaRepo.findOne({
      where: { id_detalle: Number(req.params.id) },
      relations: ["sale", "sale.client", "service", "serviceStatus", "frame", ...SALE_RELATIONS],
    });
    if (!item) { res.status(404).json({ success: false, message: "DetalleVenta no encontrado" }); return; }
    // Estado terminal: un servicio cancelado no puede modificarse.
    const bloqueoTerminal = guardEstadoTerminal({
      estadoActualNombre: item.serviceStatus?.nombre ?? "",
      claveTerminal: "cancelado", etiquetaEntidad: "servicio", genero: "m", etiquetaEstado: "Cancelado",
      alternativa: "Se conserva por trazabilidad del servicio prestado — un servicio cancelado no se reactiva.",
    });
    if (bloqueoTerminal) { res.status(409).json({ success: false, message: bloqueoTerminal }); return; }
    if (req.body.fecha       !== undefined) item.fecha       = req.body.fecha;
    if (req.body.observacion !== undefined) item.observacion = req.body.observacion;
    if (req.body.precio      !== undefined) item.precio      = req.body.precio;
    if (req.body.id_venta !== undefined) {
      const rel = await AppDataSource.getRepository(Sale).findOneBy({ id_venta: Number(req.body.id_venta) });
      if (!rel) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
      item.sale = rel;
    }
    if (req.body.id_servicio !== undefined) {
      const rel = await AppDataSource.getRepository(Service).findOneBy({ id_servicio: Number(req.body.id_servicio) });
      if (!rel) { res.status(404).json({ success: false, message: "Servicio no encontrado" }); return; }
      item.service = rel;
    }
    let nuevoEstado: ServiceStatus | null = null;
    if (req.body.id_estado !== undefined && Number(req.body.id_estado) !== item.serviceStatus?.id_estado) {
      nuevoEstado = await AppDataSource.getRepository(ServiceStatus).findOneBy({ id_estado: Number(req.body.id_estado) });
      if (!nuevoEstado) { res.status(404).json({ success: false, message: "EstadoServicio no encontrado" }); return; }
      // Un servicio Finalizado ya se entregó — el único cambio de estado
      // válido a partir de acá es cancelarlo (mismo guard que changeSaleDetailStatus).
      const bloqueoTransicion = transicionUnicaPermitida({
        estadoActualNombre: item.serviceStatus?.nombre ?? "",
        estadoNuevoNombre:  nuevoEstado.nombre,
        claveEstadoActual:    "finalizado",
        claveEstadoPermitido: "cancelado",
        etiquetaEstadoPermitido: "Cancelado",
      });
      if (bloqueoTransicion) { res.status(409).json({ success: false, message: bloqueoTransicion }); return; }
      item.serviceStatus = nuevoEstado;

      // Mismo guard/cascada que changeSaleDetailStatus (PATCH dedicado): cancelar
      // el último servicio activo de la venta cascadea hacia arriba y anula la
      // Venta también — el PUT genérico no puede quedar como un atajo que se
      // salte esta regla.
      if (nuevoEstado.nombre.toLowerCase().includes("cancelado") && item.sale && isLastActiveDetail(item.sale, item.id_detalle)) {
        if (saleHasValidatedPayments(item.sale)) {
          res.status(409).json({
            success: false,
            message: `No se puede cancelar: es el único servicio activo de la Venta #${item.sale.id_venta} y tiene pagos validados. Registra la devolución antes de cancelarlo.`,
          });
          return;
        }
        // item viene de una relación cargada aparte de item.sale.saleDetails
        // (no es el mismo objeto JS aunque comparta id_detalle) — sin este alias,
        // voidSaleCascade vería la copia con el estado viejo y lo "cancelaría"
        // dos veces (doble conteo, doble entrada de historial).
        const idx = item.sale.saleDetails?.findIndex(d => d.id_detalle === item.id_detalle) ?? -1;
        if (idx >= 0 && item.sale.saleDetails) item.sale.saleDetails[idx] = item;

        let cascada = { serviciosCancelados: 0, abonosAnulados: 0 };
        await AppDataSource.transaction(async (manager) => {
          await manager.save(item);
          await logServiceStatusChange(manager, item, nuevoEstado!);
          cascada = await voidSaleCascade(manager, item.sale!);
        });

        // El alias de arriba deja item.sale.saleDetails[idx] === item, es decir
        // item -> sale -> saleDetails -> item: una referencia circular real que
        // rompe JSON.stringify si se manda `sale` tal cual en la respuesta.
        const { sale: _saleSinCircular, ...itemSinSale } = item;
        res.json({
          success: true,
          message: `DetalleVenta actualizado — al ser el último servicio activo, la Venta #${item.sale.id_venta} también se anuló en cascada (abonos anulados: ${cascada.abonosAnulados})`,
          data: { ...itemSinSale, ...cascada },
        });
        return;
      }
    }
    if (req.body.id_marco !== undefined) {
      if (req.body.id_marco === null) {
        item.frame = null;
      } else {
        const rel = await AppDataSource.getRepository(Frame).findOneBy({ id_marco: Number(req.body.id_marco) });
        if (!rel) { res.status(404).json({ success: false, message: "Marco no encontrado" }); return; }
        item.frame = rel;
      }
    }
    // Solo se re-valida si el precio (o la venta a la que pertenece) cambió —
    // crear un DetalleVenta nunca dispara esto: su precio ya viene forzado
    // 1:1 con Venta.total desde el frontend (ver OrdersPage.tsx).
    if ((req.body.precio !== undefined || req.body.id_venta !== undefined) && item.sale) {
      const suma = await sumaServiciosVenta(detalleVentaRepo, item.sale.id_venta, item.id_detalle);
      const sumaConEstePrecio = suma + Number(item.precio);
      if (!coincideConCentavos(sumaConEstePrecio, Number(item.sale.total))) {
        res.status(409).json({
          success: false,
          message: msgTotalNoCoincide(item.sale.id_venta, Number(item.sale.total), sumaConEstePrecio),
        });
        return;
      }
    }

    await detalleVentaRepo.save(item);
    if (nuevoEstado) await logServiceStatusChange(AppDataSource.manager, item, nuevoEstado);
    res.json({ success: true, message: "DetalleVenta actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar DetalleVenta", error });
  }
};

export const toggleSaleDetailStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo = AppDataSource.getRepository(SaleDetail);
    const item = await detalleVentaRepo.findOne({
      where: { id_detalle: Number(req.params.id) },
      relations: ["serviceStatus"],
    });
    if (!item) { res.status(404).json({ success: false, message: "DetalleVenta no encontrado" }); return; }
    const bloqueoTerminal = guardEstadoTerminal({
      estadoActualNombre: item.serviceStatus?.nombre ?? "",
      claveTerminal: "cancelado", etiquetaEntidad: "servicio", genero: "m", etiquetaEstado: "Cancelado",
      alternativa: "Se conserva por trazabilidad del servicio prestado — un servicio cancelado no se reactiva.",
    });
    if (bloqueoTerminal) { res.status(409).json({ success: false, message: bloqueoTerminal }); return; }
    item.estado = !item.estado;
    await detalleVentaRepo.save(item);
    res.json({ success: true, message: `DetalleVenta ${item.estado ? "activado" : "inactivado"}`, data: { estado: item.estado } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cambiar estado de DetalleVenta", error });
  }
};

// GET /api/sale-details/:id/historial — línea de tiempo de cambios de estado
export const getSaleDetailHistorial = async (req: Request, res: Response): Promise<void> => {
  try {
    const historial = await AppDataSource.getRepository(ServiceStatusHistory).find({
      where:     { saleDetail: { id_detalle: Number(req.params.id) } },
      relations: ["serviceStatus"],
      order:     { fecha: "ASC" },
    });
    res.json({
      success: true,
      data: historial.map(h => ({
        id_historial: h.id_historial,
        estado:       h.serviceStatus?.nombre ?? "—",
        fecha:        h.fecha,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener historial de DetalleVenta", error });
  }
};
