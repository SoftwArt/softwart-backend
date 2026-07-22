// ─────────────────────────────────────────────────────────────────────────────
//  MetodoPagoController.ts  —  Catálogo (sin paginación)
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { PaymentMethod } from "../models/PaymentMethod";
import { Payment } from "../models/Payment";
import { enviarNoEliminarAsociados } from "../helpers/deleteGuard.helper";

export const getAllPaymentMethod = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await AppDataSource.getRepository(PaymentMethod).find();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener MetodoPago", error });
  }
};

export const getPaymentMethodById = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await AppDataSource.getRepository(PaymentMethod).findOne({ where: { id_metodo_pago: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "MetodoPago no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener MetodoPago", error });
  }
};

export const createPaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(PaymentMethod);
    if (!req.body.nombre) { res.status(400).json({ success: false, message: "nombre es requerido" }); return; }
    const obj = repo.create({ nombre: req.body.nombre });
    await repo.save(obj);
    res.status(201).json({ success: true, message: "MetodoPago creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear MetodoPago", error });
  }
};

export const updatePaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(PaymentMethod);
    const item = await repo.findOne({ where: { id_metodo_pago: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "MetodoPago no encontrado" }); return; }
    if (req.body.nombre !== undefined) item.nombre = req.body.nombre;
    await repo.save(item);
    res.json({ success: true, message: "MetodoPago actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar MetodoPago", error });
  }
};

export const deletePaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo     = AppDataSource.getRepository(PaymentMethod);
    const pagoRepo = AppDataSource.getRepository(Payment);
    const count = await pagoRepo.count({ where: { paymentMethod: { id_metodo_pago: Number(req.params.id) } } });
    if (count > 0) {
      enviarNoEliminarAsociados(res, {
        count, singular: "pago", plural: "pagos", genero: "m",
        alternativa: "Asigna otro método a esos pagos antes de eliminar este.",
      });
      return;
    }
    const item = await repo.findOneBy({ id_metodo_pago: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "MetodoPago no encontrado" }); return; }
    await repo.remove(item);
    res.json({ success: true, message: "MetodoPago eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar MetodoPago", error });
  }
};

// PATCH /api/metodo-pago/pago/:id_pago/metodo
export const assignPaymentMethod = async (req: Request, res: Response): Promise<void> => {
  try {
    const pagoRepo       = AppDataSource.getRepository(Payment);
    const metodoPagoRepo = AppDataSource.getRepository(PaymentMethod);
    const target = await pagoRepo.findOneBy({ id_pago: Number(req.params.id_pago) });
    if (!target) { res.status(404).json({ success: false, message: "Pago no encontrado" }); return; }
    const metodo = await metodoPagoRepo.findOneBy({ id_metodo_pago: Number(req.body.id_metodo_pago) });
    if (!metodo) { res.status(404).json({ success: false, message: "MetodoPago no encontrado" }); return; }
    target.paymentMethod = metodo;
    await pagoRepo.save(target);
    res.json({ success: true, message: "Método de pago asignado", data: target });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en assignPaymentMethod", error });
  }
};
