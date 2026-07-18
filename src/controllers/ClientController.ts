// ─────────────────────────────────────────────────────────────────────────────
//  ClienteController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { AppDataSource } from "../data-source";
import { Client } from "../models/Client";
import { Appointment } from "../models/Appointment";
import { Sale } from "../models/Sale";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { generateToken } from "../helpers/inviteToken.helper";
import { sendClientInviteEmail } from "../services/email.service";
import { logger } from "../config/logger";

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

    const { tipoDocumento, documento, nombre, correo, telefono, crearAccesoPortal } = req.body;

    // ── Con acceso al portal: Cliente + Usuario en una sola transacción ──────
    // El admin nunca define la clave — el Usuario nace con una clave
    // inutilizable (hash de bytes aleatorios que nadie conoce) y un token de
    // invitación de 24h que llega solo por correo. El cliente la configura
    // entrando por el mismo flujo que "olvidé mi contraseña" (resetPassword).
    if (crearAccesoPortal) {
      const usuarioRepo = AppDataSource.getRepository(User);
      const usuarioExiste = await usuarioRepo.findOne({ where: { correo } });
      if (usuarioExiste) {
        res.status(409).json({
          success: false,
          message: "Ya existe una cuenta de usuario con ese correo — no se puede crear el acceso. Si el cliente ya tiene cuenta, dile que use 'Olvidé mi contraseña'.",
        });
        return;
      }

      const rolRepo = AppDataSource.getRepository(Role);
      const rolCliente = await rolRepo.findOne({ where: { nombre: "Cliente" } });
      if (!rolCliente) {
        res.status(500).json({ success: false, message: "Rol 'Cliente' no configurado en el sistema" });
        return;
      }

      const { token, tokenHash, expira } = generateToken(24);
      const claveInutilizable = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

      let cliente!: Client;
      await AppDataSource.transaction(async (manager) => {
        cliente = manager.getRepository(Client).create({
          tipoDocumento, documento, nombre, correo,
          telefono: telefono ?? undefined,
          estado:   true,
        });
        await manager.save(cliente);

        const usuario = manager.getRepository(User).create({
          correo,
          clave:              claveInutilizable,
          role:               rolCliente,
          estado:             true,
          token_recuperacion: tokenHash,
          token_expira:       expira,
        });
        await manager.save(usuario);
      });

      try {
        await sendClientInviteEmail(correo, token, nombre);
      } catch (emailError) {
        logger.error({ err: emailError, correo }, "error enviando email de invitación a cliente");
        res.status(201).json({
          success: true,
          message: "Cliente y acceso creados, pero no se pudo enviar el correo de invitación. El cliente puede pedir un enlace nuevo desde 'Olvidé mi contraseña'.",
          data: cliente,
        });
        return;
      }

      res.status(201).json({ success: true, message: "Cliente creado y correo de invitación enviado", data: cliente });
      return;
    }

    // ── Camino normal — sin acceso al portal ──────────────────────────────────
    const obj = clienteRepo.create();
    obj.tipoDocumento = tipoDocumento;
    obj.documento     = documento;
    obj.nombre        = nombre;
    obj.correo        = correo;
    obj.telefono      = telefono;
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
