// ─────────────────────────────────────────────────────────────────────────────
//  PagoController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Payment } from "../models/Payment";
import { Sale } from "../models/Sale";
import { PaymentMethod } from "../models/PaymentMethod";
import { PaymentStatus } from "../models/PaymentStatus";

export const getAllPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const pagoRepo = AppDataSource.getRepository(Payment);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await pagoRepo.findAndCount({
      relations: ["sale", "paymentMethod", "paymentStatus"],
      skip,
      take: limit,
    });

    res.json({
      success: true,
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Pago", error });
  }
};

export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const pagoRepo = AppDataSource.getRepository(Payment);
    const item = await pagoRepo.findOne({
      where: { id_pago: Number(req.params.id) },
      relations: ["sale", "paymentMethod", "paymentStatus"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Pago no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Pago", error });
  }
};

export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const pagoRepo = AppDataSource.getRepository(Payment);
    const required = ["fecha", "monto"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
    const obj = pagoRepo.create();
    obj.fecha       = req.body.fecha;
    obj.monto       = req.body.monto;
    obj.observacion = req.body.observacion;
    if (req.body.id_venta !== undefined) {
      const rel = await AppDataSource.getRepository(Sale).findOneBy({ id_venta: Number(req.body.id_venta) });
      if (!rel) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
      obj.sale = rel;
    }
    if (req.body.id_metodo_pago !== undefined) {
      const rel = await AppDataSource.getRepository(PaymentMethod).findOneBy({ id_metodo_pago: Number(req.body.id_metodo_pago) });
      if (!rel) { res.status(404).json({ success: false, message: "MetodoPago no encontrado" }); return; }
      obj.paymentMethod = rel;
    }
    if (req.body.id_estado_pago !== undefined) {
      const rel = await AppDataSource.getRepository(PaymentStatus).findOneBy({ id_estado_pago: Number(req.body.id_estado_pago) });
      if (!rel) { res.status(404).json({ success: false, message: "EstadoPago no encontrado" }); return; }
      obj.paymentStatus = rel;
    }
    await pagoRepo.save(obj);
    res.status(201).json({ success: true, message: "Pago creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Pago", error });
  }
};

export const updatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const pagoRepo = AppDataSource.getRepository(Payment);
    const item = await pagoRepo.findOne({
      where: { id_pago: Number(req.params.id) },
      relations: ["sale", "paymentMethod", "paymentStatus"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Pago no encontrado" }); return; }
    if (req.body.fecha       !== undefined) item.fecha       = req.body.fecha;
    if (req.body.monto       !== undefined) item.monto       = req.body.monto;
    if (req.body.observacion !== undefined) item.observacion = req.body.observacion;
    if (req.body.id_venta !== undefined) {
      const rel = await AppDataSource.getRepository(Sale).findOneBy({ id_venta: Number(req.body.id_venta) });
      if (!rel) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
      item.sale = rel;
    }
    if (req.body.id_metodo_pago !== undefined) {
      const rel = await AppDataSource.getRepository(PaymentMethod).findOneBy({ id_metodo_pago: Number(req.body.id_metodo_pago) });
      if (!rel) { res.status(404).json({ success: false, message: "MetodoPago no encontrado" }); return; }
      item.paymentMethod = rel;
    }
    if (req.body.id_estado_pago !== undefined) {
      const rel = await AppDataSource.getRepository(PaymentStatus).findOneBy({ id_estado_pago: Number(req.body.id_estado_pago) });
      if (!rel) { res.status(404).json({ success: false, message: "EstadoPago no encontrado" }); return; }
      item.paymentStatus = rel;
    }
    await pagoRepo.save(item);
    res.json({ success: true, message: "Pago actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Pago", error });
  }
};

export const deletePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const pagoRepo = AppDataSource.getRepository(Payment);
    const item = await pagoRepo.findOneBy({ id_pago: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Pago no encontrado" }); return; }
    await pagoRepo.remove(item);
    res.json({ success: true, message: "Pago eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar Pago", error });
  }
};
