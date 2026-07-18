// ─────────────────────────────────────────────────────────────────────────────
//  EstadoServicioController.ts  —  Catálogo (sin paginación)
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ServiceStatus } from "../models/ServiceStatus";
import { SaleDetail } from "../models/SaleDetail";
import { saleHasValidatedPayments, voidSaleCascade, isLastActiveDetail } from "../helpers/saleCascade.helper";
import { logServiceStatusChange } from "../helpers/serviceStatusHistory.helper";

const SALE_RELATIONS = ["sale", "sale.saleDetails", "sale.saleDetails.serviceStatus", "sale.payments", "sale.payments.paymentStatus"];

export const getAllServiceStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await AppDataSource.getRepository(ServiceStatus).find();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener EstadoServicio", error });
  }
};

export const getServiceStatusById = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await AppDataSource.getRepository(ServiceStatus).findOne({ where: { id_estado: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "EstadoServicio no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener EstadoServicio", error });
  }
};

export const createServiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(ServiceStatus);
    if (!req.body.nombre) { res.status(400).json({ success: false, message: "nombre es requerido" }); return; }
    const obj = repo.create({ nombre: req.body.nombre });
    await repo.save(obj);
    res.status(201).json({ success: true, message: "EstadoServicio creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear EstadoServicio", error });
  }
};

export const updateServiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(ServiceStatus);
    const item = await repo.findOne({ where: { id_estado: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "EstadoServicio no encontrado" }); return; }
    if (req.body.nombre !== undefined) item.nombre = req.body.nombre;
    await repo.save(item);
    res.json({ success: true, message: "EstadoServicio actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar EstadoServicio", error });
  }
};

export const deleteServiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo             = AppDataSource.getRepository(ServiceStatus);
    const detalleVentaRepo = AppDataSource.getRepository(SaleDetail);
    const count = await detalleVentaRepo.count({ where: { serviceStatus: { id_estado: Number(req.params.id) } } });
    if (count > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen DetalleVenta asociados (${count})` }); return; }
    const item = await repo.findOneBy({ id_estado: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "EstadoServicio no encontrado" }); return; }
    await repo.remove(item);
    res.json({ success: true, message: "EstadoServicio eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar EstadoServicio", error });
  }
};

// PATCH /api/estado-servicio/detalle/:id_detalle/estado
export const changeSaleDetailStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo   = AppDataSource.getRepository(SaleDetail);
    const estadoServicioRepo = AppDataSource.getRepository(ServiceStatus);
    const target = await detalleVentaRepo.findOne({
      where: { id_detalle: Number(req.params.id_detalle) },
      relations: ["serviceStatus", ...SALE_RELATIONS],
    });
    if (!target) { res.status(404).json({ success: false, message: "DetalleVenta no encontrado" }); return; }
    // Estado terminal: un servicio cancelado no puede cambiar de estado.
    if (target.serviceStatus?.nombre?.toLowerCase().includes("cancelado")) {
      res.status(409).json({ success: false, message: "No se puede cambiar el estado de un servicio cancelado" }); return;
    }
    const nuevoEstado = await estadoServicioRepo.findOneBy({ id_estado: Number(req.body.id_estado) });
    if (!nuevoEstado) { res.status(404).json({ success: false, message: "EstadoServicio no encontrado" }); return; }

    // Cancelar el último servicio activo de la venta cascadea hacia arriba: la
    // venta se anula también (misma regla que anular Venta directamente).
    if (nuevoEstado.nombre.toLowerCase().includes("cancelado") && target.sale && isLastActiveDetail(target.sale, target.id_detalle)) {
      if (saleHasValidatedPayments(target.sale)) {
        res.status(409).json({
          success: false,
          message: `No se puede cancelar: es el único servicio activo de la Venta #${target.sale.id_venta} y tiene pagos validados. Registra la devolución antes de cancelarlo.`,
        });
        return;
      }

      // target viene de una relación cargada aparte de target.sale.saleDetails
      // (no es el mismo objeto JS aunque comparta id_detalle) — sin este alias,
      // voidSaleCascade vería la copia con el estado viejo y lo "cancelaría"
      // dos veces (doble conteo, doble entrada de historial).
      const idx = target.sale.saleDetails?.findIndex(d => d.id_detalle === target.id_detalle) ?? -1;
      if (idx >= 0 && target.sale.saleDetails) target.sale.saleDetails[idx] = target;

      let cascada = { serviciosCancelados: 0, abonosAnulados: 0 };
      await AppDataSource.transaction(async (manager) => {
        cascada = await voidSaleCascade(manager, target.sale!);
      });

      res.json({
        success: true,
        message: `Servicio cancelado — al ser el último activo, la Venta #${target.sale.id_venta} también se anuló en cascada (abonos anulados: ${cascada.abonosAnulados})`,
        data: { ...target, ...cascada },
      });
      return;
    }

    target.serviceStatus = nuevoEstado;
    await detalleVentaRepo.save(target);
    await logServiceStatusChange(AppDataSource.manager, target, nuevoEstado);
    res.json({ success: true, message: "Estado de DetalleVenta actualizado", data: target });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en changeSaleDetailStatus", error });
  }
};
