// ─────────────────────────────────────────────────────────────────────────────
//  VentaController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Venta } from "../models/Venta";
import { DetalleVenta } from "../models/DetalleVenta";
import { Pago } from "../models/Pago";
import { Cita } from "../models/Cita";
import { Cliente } from "../models/Cliente";

export const getAllVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const ventaRepo = AppDataSource.getRepository(Venta);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await ventaRepo.findAndCount({
      relations: ["cita", "cliente", "pagos"],
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

export const getVentaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const ventaRepo = AppDataSource.getRepository(Venta);
    const item = await ventaRepo.findOne({
      where: { id_venta: Number(req.params.id) },
      relations: ["cita", "cliente"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Venta", error });
  }
};

export const createVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const ventaRepo = AppDataSource.getRepository(Venta);
    const required = ["fecha", "total"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
    const obj = ventaRepo.create();
    obj.fecha       = req.body.fecha;
    obj.total       = req.body.total;
    obj.observacion = req.body.observacion;
    obj.estado      = req.body.estado !== undefined ? req.body.estado : true;
    if (req.body.id_cita != null) {
      const rel = await AppDataSource.getRepository(Cita).findOneBy({ id_cita: Number(req.body.id_cita) });
      if (!rel) { res.status(404).json({ success: false, message: "Cita no encontrado" }); return; }
      obj.cita = rel;
    }
    if (req.body.id_cliente !== undefined) {
      const rel = await AppDataSource.getRepository(Cliente).findOneBy({ id_cliente: Number(req.body.id_cliente) });
      if (!rel) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
      obj.cliente = rel;
    }
    await ventaRepo.save(obj);
    res.status(201).json({ success: true, message: "Venta creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Venta", error });
  }
};

export const updateVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const ventaRepo = AppDataSource.getRepository(Venta);
    const item = await ventaRepo.findOne({
      where: { id_venta: Number(req.params.id) },
      relations: ["cita", "cliente"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
    if (req.body.fecha       !== undefined) item.fecha       = req.body.fecha;
    if (req.body.total       !== undefined) item.total       = req.body.total;
    if (req.body.observacion !== undefined) item.observacion = req.body.observacion;
    if (req.body.id_cita != null) {
      const rel = await AppDataSource.getRepository(Cita).findOneBy({ id_cita: Number(req.body.id_cita) });
      if (!rel) { res.status(404).json({ success: false, message: "Cita no encontrado" }); return; }
      item.cita = rel;
    }
    if (req.body.id_cliente !== undefined) {
      const rel = await AppDataSource.getRepository(Cliente).findOneBy({ id_cliente: Number(req.body.id_cliente) });
      if (!rel) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
      item.cliente = rel;
    }
    await ventaRepo.save(item);
    res.json({ success: true, message: "Venta actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Venta", error });
  }
};

export const deleteVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const ventaRepo        = AppDataSource.getRepository(Venta);
    const detalleVentaRepo = AppDataSource.getRepository(DetalleVenta);
    const pagoRepo         = AppDataSource.getRepository(Pago);
    const countDetalle = await detalleVentaRepo.count({ where: { venta: { id_venta: Number(req.params.id) } } });
    if (countDetalle > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen DetalleVenta asociados (${countDetalle})` }); return; }
    const countPago = await pagoRepo.count({ where: { venta: { id_venta: Number(req.params.id) } } });
    if (countPago > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen Pago asociados (${countPago})` }); return; }
    const item = await ventaRepo.findOneBy({ id_venta: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
    await ventaRepo.remove(item);
    res.json({ success: true, message: "Venta eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar Venta", error });
  }
};

export const toggleEstadoVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const ventaRepo = AppDataSource.getRepository(Venta);
    const item = await ventaRepo.findOneBy({ id_venta: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
    item.estado = !item.estado;
    await ventaRepo.save(item);
    res.json({ success: true, message: `Venta ${item.estado ? "activado" : "inactivado"}`, data: { estado: item.estado } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cambiar estado de Venta", error });
  }
};
