// ─────────────────────────────────────────────────────────────────────────────
//  EstadoPagoController.ts  —  Catálogo (sin paginación)
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { PaymentStatus } from "../models/PaymentStatus";
import { Payment } from "../models/Payment";

export const getAllEstadoPago = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await AppDataSource.getRepository(PaymentStatus).find();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener EstadoPago", error });
  }
};

export const getEstadoPagoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await AppDataSource.getRepository(PaymentStatus).findOne({ where: { id_estado_pago: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "EstadoPago no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener EstadoPago", error });
  }
};

export const createEstadoPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(PaymentStatus);
    if (!req.body.nombre) { res.status(400).json({ success: false, message: "nombre es requerido" }); return; }
    const obj = repo.create({ nombre: req.body.nombre });
    await repo.save(obj);
    res.status(201).json({ success: true, message: "EstadoPago creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear EstadoPago", error });
  }
};

export const updateEstadoPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(PaymentStatus);
    const item = await repo.findOne({ where: { id_estado_pago: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "EstadoPago no encontrado" }); return; }
    if (req.body.nombre !== undefined) item.nombre = req.body.nombre;
    await repo.save(item);
    res.json({ success: true, message: "EstadoPago actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar EstadoPago", error });
  }
};

export const deleteEstadoPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo     = AppDataSource.getRepository(PaymentStatus);
    const pagoRepo = AppDataSource.getRepository(Payment);
    const count = await pagoRepo.count({ where: { paymentStatus: { id_estado_pago: Number(req.params.id) } } });
    if (count > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen Pago asociados (${count})` }); return; }
    const item = await repo.findOneBy({ id_estado_pago: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "EstadoPago no encontrado" }); return; }
    await repo.remove(item);
    res.json({ success: true, message: "EstadoPago eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar EstadoPago", error });
  }
};

// PATCH /api/estado-pago/pago/:id_pago/estado
export const cambiarEstadoPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const pagoRepo       = AppDataSource.getRepository(Payment);
    const estadoPagoRepo = AppDataSource.getRepository(PaymentStatus);
    const target = await pagoRepo.findOneBy({ id_pago: Number(req.params.id_pago) });
    if (!target) { res.status(404).json({ success: false, message: "Pago no encontrado" }); return; }
    const nuevoEstado = await estadoPagoRepo.findOneBy({ id_estado_pago: Number(req.body.id_estado_pago) });
    if (!nuevoEstado) { res.status(404).json({ success: false, message: "EstadoPago no encontrado" }); return; }
    target.paymentStatus = nuevoEstado;
    await pagoRepo.save(target);
    res.json({ success: true, message: "Estado de Pago actualizado", data: target });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en cambiarEstadoPago", error });
  }
};
