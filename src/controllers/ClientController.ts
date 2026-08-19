// ─────────────────────────────────────────────────────────────────────────────
//  ClienteController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { ILike } from "typeorm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { AppDataSource } from "../data-source";
import { Client } from "../models/Client";
import { Appointment } from "../models/Appointment";
import { Sale } from "../models/Sale";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { generateToken } from "../helpers/inviteToken.helper";
import { insertarAceptacionesLegales } from "../helpers/legalAcceptance.helper";
import { ContextoAceptacion } from "../models/LegalAcceptance";
import { sendWelcomePasswordSetupEmail } from "../services/email.service";
import { logger } from "../config/logger";
import { AccountEmailError, syncAccountEmail } from "../helpers/accountEmail.helper";
import { enviarNoEliminarAsociados } from "../helpers/deleteGuard.helper";

export const getAllClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteRepo = AppDataSource.getRepository(Client);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    // ?q= opcional (usado por el Combobox de selección de Cliente en Citas/Ventas
    // para buscar más allá del top-100 por recencia) — OR-across-fields vía array
    // de where, sin cambiar el comportamiento cuando no viene q.
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const where = q
      ? [{ nombre: ILike(`%${q}%`) }, { documento: ILike(`%${q}%`) }, { correo: ILike(`%${q}%`) }]
      : {};

    const [items, total] = await clienteRepo.findAndCount({ where, skip, take: limit, order: { id_cliente: "DESC" } });

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
    const usuarioRepo = AppDataSource.getRepository(User);
    const required = ["tipoDocumento", "documento", "nombre", "correo"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }

    const { tipoDocumento, documento, nombre, correo, telefono } = req.body;

    const [porDocumento, porCorreo, usuarioPorCorreo] = await Promise.all([
      clienteRepo.findOne({ where: { documento } }),
      clienteRepo.findOne({ where: { correo } }),
      usuarioRepo.findOne({ where: { correo } }),
    ]);
    if (porDocumento) { res.status(409).json({ success: false, message: "Ya existe un cliente registrado con ese número de documento" }); return; }
    if (porCorreo)    { res.status(409).json({ success: false, message: "Ya existe un cliente registrado con ese correo" }); return; }
    if (usuarioPorCorreo) { res.status(409).json({ success: false, message: "Ya existe un usuario registrado con ese correo" }); return; }

    const rolCliente = await AppDataSource.getRepository(Role).findOneBy({ id_rol: 2 });
    if (!rolCliente) { res.status(500).json({ success: false, message: "Rol Cliente (id_rol=2) no configurado" }); return; }

    const { token, tokenHash, expira } = generateToken(24);
    const claveTemporal = crypto.randomBytes(32).toString("base64url");
    let obj!: Client;

    await AppDataSource.transaction(async (manager) => {
      const clienteTx = manager.getRepository(Client);
      const usuarioTx = manager.getRepository(User);

      obj = clienteTx.create({
        tipoDocumento,
        documento,
        nombre,
        correo,
        telefono: telefono ?? null,
        estado: req.body.estado !== undefined ? req.body.estado : true,
      });
      await clienteTx.save(obj);

      const usuario = usuarioTx.create({
        correo,
        clave: await bcrypt.hash(claveTemporal, 10),
        estado: true,
        role: rolCliente,
        token_recuperacion: tokenHash,
        token_expira: expira,
      });
      await usuarioTx.save(usuario);

      await insertarAceptacionesLegales(manager, {
        id_cliente: obj.id_cliente,
        id_usuario_actor: req.user?.id_usuario ?? null,
        documento_titular: obj.documento,
        correo_titular: obj.correo,
        contexto: ContextoAceptacion.REGISTRO_ADMIN,
        ip: req.ip ?? null,
        user_agent: req.headers["user-agent"] ?? null,
      });
    });

    sendWelcomePasswordSetupEmail(correo, nombre, token).catch((error) => {
      logger.error({ err: error, correo, id_cliente: obj.id_cliente }, "error al enviar bienvenida de cliente");
    });

    res.status(201).json({ success: true, message: "Cliente y usuario creados exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Cliente", error });
  }
};

export const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteRepo = AppDataSource.getRepository(Client);
    const item = await clienteRepo.findOne({ where: { id_cliente: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }

    if (req.body.documento !== undefined && req.body.documento !== item.documento) {
      const porDocumento = await clienteRepo.findOne({ where: { documento: req.body.documento } });
      if (porDocumento) { res.status(409).json({ success: false, message: "Ya existe un cliente registrado con ese número de documento" }); return; }
    }
    const correoCambio = req.body.correo !== undefined && req.body.correo !== item.correo;
    if (correoCambio) {
      await AppDataSource.transaction(async (manager) => {
        const itemTx = await manager.getRepository(Client).findOneBy({ id_cliente: item.id_cliente });
        if (!itemTx) throw new AccountEmailError(404, "Cliente no encontrado");
        if (req.body.tipoDocumento !== undefined) itemTx.tipoDocumento = req.body.tipoDocumento;
        if (req.body.documento !== undefined) itemTx.documento = req.body.documento;
        if (req.body.nombre !== undefined) itemTx.nombre = req.body.nombre;
        if (req.body.telefono !== undefined) itemTx.telefono = req.body.telefono;
        await syncAccountEmail(manager, { id_cliente: item.id_cliente, correo: req.body.correo });
        itemTx.correo = req.body.correo;
        await manager.getRepository(Client).save(itemTx);
      });
    } else {
      if (req.body.tipoDocumento !== undefined) item.tipoDocumento = req.body.tipoDocumento;
      if (req.body.documento !== undefined) item.documento = req.body.documento;
      if (req.body.nombre !== undefined) item.nombre = req.body.nombre;
      if (req.body.telefono !== undefined) item.telefono = req.body.telefono;
      await clienteRepo.save(item);
    }

    if (correoCambio) item.correo = req.body.correo;
    res.json({ success: true, message: "Cliente actualizado", data: item });
  } catch (error) {
    if (error instanceof AccountEmailError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: "Error al actualizar Cliente", error });
  }
};

export const deleteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteRepo = AppDataSource.getRepository(Client);
    const citaRepo    = AppDataSource.getRepository(Appointment);
    const ventaRepo   = AppDataSource.getRepository(Sale);
    const countCita  = await citaRepo.count({ where: { client: { id_cliente: Number(req.params.id) } } });
    if (countCita > 0) {
      enviarNoEliminarAsociados(res, {
        count: countCita, singular: "cita", plural: "citas", genero: "f",
        alternativa: "Desactívalo en su lugar.",
      });
      return;
    }
    const countVenta = await ventaRepo.count({ where: { client: { id_cliente: Number(req.params.id) } } });
    if (countVenta > 0) {
      enviarNoEliminarAsociados(res, {
        count: countVenta, singular: "venta", plural: "ventas", genero: "f",
        alternativa: "Desactívalo en su lugar.",
      });
      return;
    }
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
