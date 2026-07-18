// ─────────────────────────────────────────────────────────────────────────────
//  VentaController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Sale } from "../models/Sale";
import { Appointment } from "../models/Appointment";
import { Client } from "../models/Client";
import { saleHasValidatedPayments, voidSaleCascade } from "../helpers/saleCascade.helper";

const CASCADE_RELATIONS = ["saleDetails", "saleDetails.serviceStatus", "payments", "payments.paymentStatus"];

export const getAllSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const ventaRepo = AppDataSource.getRepository(Sale);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await ventaRepo.findAndCount({
      relations: ["appointment", "client", "payments", "payments.paymentStatus"],
      skip,
      take: limit,
    });

    res.json({
      success: true,
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Venta", error });
  }
};

export const getSaleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const ventaRepo = AppDataSource.getRepository(Sale);
    const item = await ventaRepo.findOne({
      where: { id_venta: Number(req.params.id) },
      relations: ["appointment", "client", ...CASCADE_RELATIONS],
    });
    if (!item) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Venta", error });
  }
};

export const createSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const ventaRepo = AppDataSource.getRepository(Sale);
    const required = ["fecha", "total"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
    const obj = ventaRepo.create();
    obj.fecha       = req.body.fecha;
    obj.total       = req.body.total;
    obj.observacion = req.body.observacion;
    obj.estado      = req.body.estado !== undefined ? req.body.estado : true;
    if (req.body.id_cita != null) {
      const rel = await AppDataSource.getRepository(Appointment).findOneBy({ id_cita: Number(req.body.id_cita) });
      if (!rel) { res.status(404).json({ success: false, message: "Cita no encontrado" }); return; }
      obj.appointment = rel;
    }
    if (req.body.id_cliente !== undefined) {
      const rel = await AppDataSource.getRepository(Client).findOneBy({ id_cliente: Number(req.body.id_cliente) });
      if (!rel) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
      obj.client = rel;
    }
    await ventaRepo.save(obj);
    res.status(201).json({ success: true, message: "Venta creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Venta", error });
  }
};

export const updateSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const ventaRepo = AppDataSource.getRepository(Sale);
    const item = await ventaRepo.findOne({
      where: { id_venta: Number(req.params.id) },
      relations: ["appointment", "client"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
    if (req.body.fecha       !== undefined) item.fecha       = req.body.fecha;
    if (req.body.total       !== undefined) item.total       = req.body.total;
    if (req.body.observacion !== undefined) item.observacion = req.body.observacion;
    if (req.body.id_cita != null) {
      const rel = await AppDataSource.getRepository(Appointment).findOneBy({ id_cita: Number(req.body.id_cita) });
      if (!rel) { res.status(404).json({ success: false, message: "Cita no encontrado" }); return; }
      item.appointment = rel;
    }
    if (req.body.id_cliente !== undefined) {
      const rel = await AppDataSource.getRepository(Client).findOneBy({ id_cliente: Number(req.body.id_cliente) });
      if (!rel) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
      item.client = rel;
    }
    await ventaRepo.save(item);
    res.json({ success: true, message: "Venta actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Venta", error });
  }
};

// PATCH /api/sales/:id/estado
// Reactivar: toggle simple. Anular: bloquea si hay pagos validados (implican
// devolución, no anulación) y, si no, cancela en cascada los servicios no
// finalizados y anula los abonos pendientes — todo en una transacción.
export const toggleSaleStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const ventaRepo = AppDataSource.getRepository(Sale);
    const item = await ventaRepo.findOne({
      where: { id_venta: Number(req.params.id) },
      relations: ["saleDetails", "saleDetails.serviceStatus", "payments", "payments.paymentStatus"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }

    // Reactivar — toggle simple, sin cascada
    if (!item.estado) {
      item.estado = true;
      await ventaRepo.save(item);
      res.json({ success: true, message: "Venta activada", data: { estado: true } });
      return;
    }

    // Anular — bloquear si hay pagos validados (dinero real recibido → devolución)
    if (saleHasValidatedPayments(item)) {
      res.status(409).json({
        success: false,
        message: "No se puede anular: la venta tiene pagos validados. Registra la devolución antes de anularla.",
      });
      return;
    }

    let cascada: { serviciosCancelados: number; abonosAnulados: number } = { serviciosCancelados: 0, abonosAnulados: 0 };
    await AppDataSource.transaction(async (manager) => {
      cascada = await voidSaleCascade(manager, item);
    });

    res.json({
      success: true,
      message: `Venta anulada (servicios cancelados: ${cascada.serviciosCancelados}, abonos anulados: ${cascada.abonosAnulados})`,
      data: { estado: false, ...cascada },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cambiar estado de Venta", error });
  }
};
