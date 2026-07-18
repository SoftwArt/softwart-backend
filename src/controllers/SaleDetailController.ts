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
    if (req.body.id_venta !== undefined) {
      const rel = await AppDataSource.getRepository(Sale).findOneBy({ id_venta: Number(req.body.id_venta) });
      if (!rel) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
      obj.sale = rel;
    }
    if (req.body.id_servicio !== undefined) {
      const rel = await AppDataSource.getRepository(Service).findOneBy({ id_servicio: Number(req.body.id_servicio) });
      if (!rel) { res.status(404).json({ success: false, message: "Servicio no encontrado" }); return; }
      obj.service = rel;
    }
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
      relations: ["sale", "sale.client", "service", "serviceStatus", "frame"],
    });
    if (!item) { res.status(404).json({ success: false, message: "DetalleVenta no encontrado" }); return; }
    // Estado terminal: un servicio cancelado no puede modificarse.
    if (item.serviceStatus?.nombre?.toLowerCase().includes("cancelado")) {
      res.status(409).json({ success: false, message: "No se puede modificar un servicio cancelado" }); return;
    }
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
      item.serviceStatus = nuevoEstado;
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
    if (item.serviceStatus?.nombre?.toLowerCase().includes("cancelado")) {
      res.status(409).json({ success: false, message: "No se puede modificar un servicio cancelado" }); return;
    }
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
