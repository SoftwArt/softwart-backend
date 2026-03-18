// src/controllers/AuthController.ts
import { Request, Response } from "express";
import { AppDataSource }     from "../data-source";
import { Usuario }           from "../models/Usuario";
import { Cliente }           from "../models/Cliente";
import { Rol }               from "../models/Rol";
import jwt                   from "jsonwebtoken";
import bcrypt                from "bcrypt";
import crypto                from "crypto";
import { sendRecoveryEmail } from "../services/email.service";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret_cambiame_en_prod";

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/registro
//  Uso exclusivo de la landing page — crea Cliente + Usuario en una sola llamada
//  Body: { tipoDocumento, documento, nombre, correo, clave, telefono }
// ─────────────────────────────────────────────────────────────────────────────
export const registro = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioRepo = AppDataSource.getRepository(Usuario);
    const clienteRepo = AppDataSource.getRepository(Cliente);
    const rolRepo     = AppDataSource.getRepository(Rol);

    const { tipoDocumento, documento, nombre, correo, clave, telefono } = req.body;

    // Validar campos requeridos
    const required = ["tipoDocumento", "documento", "nombre", "correo", "clave", "telefono"];
    const missing  = required.filter(k => !req.body[k]);
    if (missing.length) {
      res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` });
      return;
    }

    // Verificar que el correo no exista ni en Usuario ni en Cliente
    const [usuarioExiste, clienteExiste] = await Promise.all([
      usuarioRepo.findOne({ where: { correo } }),
      clienteRepo.findOne({ where: { correo } }),
    ]);

    if (usuarioExiste || clienteExiste) {
      res.status(409).json({ success: false, message: "Ya existe una cuenta con ese correo" });
      return;
    }

    // Buscar el rol "Cliente" — debe existir en la BD (creado por el admin o seed)
    const rolCliente = await rolRepo.findOne({ where: { nombre: "Cliente" } });
    if (!rolCliente) {
      res.status(500).json({ success: false, message: "Rol 'Cliente' no configurado en el sistema" });
      return;
    }

    // Crear Cliente (datos de negocio)
    const cliente = clienteRepo.create({
      tipoDocumento,
      documento,
      nombre,
      correo,
      telefono: telefono ?? null,
      estado:   true,
    });
    await clienteRepo.save(cliente);

    // Crear Usuario (seguridad) vinculado por correo
    const hash    = await bcrypt.hash(clave, 10);
    const usuario = usuarioRepo.create({
      correo,
      clave:  hash,
      rol:    rolCliente,
      estado: true,
    });
    await usuarioRepo.save(usuario);

    res.status(201).json({
      success: true,
      message: "Cuenta creada exitosamente",
      data: {
        id_cliente: cliente.id_cliente,
        nombre:     cliente.nombre,
        correo:     cliente.correo,
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error al registrar cuenta", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/login
//  Body: { correo, clave }
//  El token incluye id_cliente (null si es Admin/Empleado sin Cliente asociado)
//  El frontend usa "rol" para redirigir:
//    "Admin" / "Empleado" → panel admin  (PrivateRoute React)
//    "Cliente"            → landing / mis citas
// ─────────────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { correo, clave } = req.body;

    if (!correo || !clave) {
      res.status(400).json({ success: false, message: "Correo y clave son requeridos" });
      return;
    }

    const usuarioRepo = AppDataSource.getRepository(Usuario);
    const clienteRepo = AppDataSource.getRepository(Cliente);

    // Buscar usuario (seguridad)
    const usuario = await usuarioRepo.findOne({
      where:     { correo },
      relations: ["rol"],
    });

    if (!usuario) {
      res.status(401).json({ success: false, message: "Credenciales inválidas" });
      return;
    }

    if (!usuario.estado) {
      res.status(403).json({ success: false, message: "Cuenta inactiva" });
      return;
    }

    const claveValida = await bcrypt.compare(clave, usuario.clave);
    if (!claveValida) {
      res.status(401).json({ success: false, message: "Credenciales inválidas" });
      return;
    }

    // Buscar si tiene Cliente asociado por correo
    const cliente    = await clienteRepo.findOne({ where: { correo } });
    const id_cliente = cliente?.id_cliente ?? null;

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        correo:     usuario.correo,
        id_rol:     usuario.rol?.id_rol,
        rol:        usuario.rol?.nombre,
        id_cliente,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      success: true,
      message: "Bienvenido",
      token,
      data: {
        id_usuario: usuario.id_usuario,
        correo:     usuario.correo,
        rol:        usuario.rol?.nombre,
        id_cliente,
        nombre:     cliente?.nombre ?? null,
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error en login", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/recuperar
//  Body: { correo }
//  Genera token de recuperación y envía email
// ─────────────────────────────────────────────────────────────────────────────
export const recuperar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { correo } = req.body;

    if (!correo) {
      res.status(400).json({ success: false, message: "El correo es requerido" });
      return;
    }

    const usuarioRepo = AppDataSource.getRepository(Usuario);
    const usuario = await usuarioRepo.findOne({ where: { correo } });

    if (!usuario) {
      res.json({ success: true, message: "Si el correo existe, recibirás un enlace de recuperación" });
      return;
    }

    console.log("1️⃣ Usuario encontrado, generando token...");

    const token  = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    usuario.token_recuperacion = token;
    usuario.token_expira       = expira;
    await usuarioRepo.save(usuario);

    console.log("2️⃣ Token guardado en BD, enviando email...");

    await sendRecoveryEmail(correo, token);

    console.log("3️⃣ Email enviado, respondiendo...");

    res.json({ success: true, message: "Si el correo existe, recibirás un enlace de recuperación" });

  } catch (error) {
    console.error("❌ Error en recuperar:", error);
    res.status(500).json({ success: false, message: "Error al procesar solicitud", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/reset-password
//  Body: { token, nueva_clave }
//  Valida token y actualiza contraseña
// ─────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, nueva_clave } = req.body;

    if (!token || !nueva_clave) {
      res.status(400).json({ success: false, message: "Token y nueva contraseña son requeridos" });
      return;
    }

    const usuarioRepo = AppDataSource.getRepository(Usuario);
    const usuario     = await usuarioRepo.findOne({
      where: { token_recuperacion: token },
    });

    if (!usuario || !usuario.token_expira) {
      res.status(400).json({ success: false, message: "Token inválido o expirado" });
      return;
    }

    if (usuario.token_expira < new Date()) {
      res.status(400).json({ success: false, message: "El token ha expirado" });
      return;
    }

    usuario.clave              = await bcrypt.hash(nueva_clave, 10);
    usuario.token_recuperacion = null;
    usuario.token_expira       = null;
    await usuarioRepo.save(usuario);

    res.json({
      success: true,
      message: "Contraseña actualizada correctamente",
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error al restablecer contraseña", error });
  }
};