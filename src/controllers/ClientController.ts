// ─────────────────────────────────────────────────────────────────────────────
//  ClienteController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Client } from "../models/Client";
import { Appointment } from "../models/Appointment";
import { Sale } from "../models/Sale";
import { User } from "../models/User";

export const getAllClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteRepo = AppDataSource.getRepository(Client);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await clienteRepo.findAndCount({ skip, take: limit });

    res.json({
      success: true,
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Cliente", error });
  }
};

export const getClientById = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteRepo = AppDataSource.getRepository(Client);
    const item = await clienteRepo.findOne({ where: { id_cliente: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Cliente", error });
  }
};

export const createClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteRepo = AppDataSource.getRepository(Client);
    const required = ["tipoDocumento", "documento", "nombre", "correo"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
    const obj = clienteRepo.create();
    obj.tipoDocumento = req.body.tipoDocumento;
    obj.documento     = req.body.documento;
    obj.nombre        = req.body.nombre;
    obj.correo        = req.body.correo;
    obj.telefono      = req.body.telefono;
    obj.estado        = req.body.estado !== undefined ? req.body.estado : true;
    await clienteRepo.save(obj);
    res.status(201).json({ success: true, message: "Cliente creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Cliente", error });
  }
};

export const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteRepo = AppDataSource.getRepository(Client);
    const item = await clienteRepo.findOne({ where: { id_cliente: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
    if (req.body.tipoDocumento !== undefined) item.tipoDocumento = req.body.tipoDocumento;
    if (req.body.documento     !== undefined) item.documento     = req.body.documento;
    if (req.body.nombre        !== undefined) item.nombre        = req.body.nombre;
    if (req.body.correo        !== undefined) item.correo        = req.body.correo;
    if (req.body.telefono      !== undefined) item.telefono      = req.body.telefono;
    await clienteRepo.save(item);
    res.json({ success: true, message: "Cliente actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Cliente", error });
  }
};

export const deleteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteRepo = AppDataSource.getRepository(Client);
    const citaRepo    = AppDataSource.getRepository(Appointment);
    const ventaRepo   = AppDataSource.getRepository(Sale);
    const countCita  = await citaRepo.count({ where: { client: { id_cliente: Number(req.params.id) } } });
    if (countCita > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen Cita asociados (${countCita})` }); return; }
    const countVenta = await ventaRepo.count({ where: { client: { id_cliente: Number(req.params.id) } } });
    if (countVenta > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen Venta asociados (${countVenta})` }); return; }
    const item = await clienteRepo.findOneBy({ id_cliente: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
    // Eliminar también el Usuario asociado por correo
    const usuarioRepo = AppDataSource.getRepository(User);
    const usuario = await usuarioRepo.findOneBy({ correo: item.correo });
    await clienteRepo.remove(item);
    if (usuario) await usuarioRepo.remove(usuario);
    res.json({ success: true, message: "Cliente y usuario eliminados correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar Cliente", error });
  }
};

export const toggleClientStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteRepo = AppDataSource.getRepository(Client);
    const item = await clienteRepo.findOneBy({ id_cliente: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
    item.estado = !item.estado;
    await clienteRepo.save(item);
    res.json({ success: true, message: `Cliente ${item.estado ? "activado" : "inactivado"}`, data: { estado: item.estado } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cambiar estado de Cliente", error });
  }
};
