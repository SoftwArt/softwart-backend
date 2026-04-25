// src/controllers/AuthController.ts
import { Request, Response } from "express";
import { AppDataSource }     from "../data-source";
import { User }           from "../models/User";
import { Client }           from "../models/Client";
import { Role }               from "../models/Role";
import jwt                   from "jsonwebtoken";
import bcrypt                from "bcrypt";
import crypto                from "crypto";

const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");
import { sendRecoveryEmail } from "../services/email.service";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET no definida — el servidor no puede arrancar");

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/register-guest
//  Landing pública — crea solo Cliente (sin Usuario) para clientes ocasionales.
//  Si ya existe un Cliente con ese correo devuelve 409 con flag `tieneCliente: true`
//  para que el frontend sugiera hacer login en lugar de registrarse de nuevo.
//  Body: { tipoDocumento, documento, nombre, correo, telefono? }
// ─────────────────────────────────────────────────────────────────────────────
export const registerGuest = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteRepo = AppDataSource.getRepository(Client);
    const { tipoDocumento, documento, nombre, correo, telefono } = req.body;

    const clienteExiste = await clienteRepo.findOne({ where: { correo } });
    if (clienteExiste) {
      res.status(409).json({
        success:      false,
        tieneCliente: true,
        message:      "Ya existe un registro con ese correo. Si quieres rastrear tus pedidos, crea una cuenta.",
      });
      return;
    }

    const cliente = clienteRepo.create({
      tipoDocumento,
      documento,
      nombre,
      correo,
      telefono: telefono ?? null,
      estado:   true,
    });
    await clienteRepo.save(cliente);

    res.status(201).json({
      success: true,
      message: "¡Listo! Tus datos quedaron registrados. Nos pondremos en contacto contigo pronto.",
      data: { id_cliente: cliente.id_cliente, nombre: cliente.nombre, correo: cliente.correo },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error al registrar datos", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/register
//  Landing página registrar — crea Cliente + Usuario en una sola llamada.
//  Si ya existe un Cliente con ese correo (fue creado como invitado), solo crea
//  el Usuario y lo vincula por correo — así se preserva el historial de pedidos.
//  Body: { tipoDocumento, documento, nombre, correo, clave, telefono }
// ─────────────────────────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioRepo = AppDataSource.getRepository(User);
    const clienteRepo = AppDataSource.getRepository(Client);
    const rolRepo     = AppDataSource.getRepository(Role);

    const { tipoDocumento, documento, nombre, correo, clave, telefono } = req.body;

    const [usuarioExiste, clienteExiste] = await Promise.all([
      usuarioRepo.findOne({ where: { correo } }),
      clienteRepo.findOne({ where: { correo } }),
    ]);

    if (usuarioExiste) {
      res.status(409).json({ success: false, message: "Ya existe una cuenta con ese correo" });
      return;
    }

    const rolCliente = await rolRepo.findOne({ where: { nombre: "Cliente" } });
    if (!rolCliente) {
      res.status(500).json({ success: false, message: "Rol 'Cliente' no configurado en el sistema" });
      return;
    }

    // Si ya existe como invitado, reutiliza el Cliente — solo crea el Usuario
    let cliente = clienteExiste;
    if (!cliente) {
      cliente = clienteRepo.create({
        tipoDocumento,
        documento,
        nombre,
        correo,
        telefono: telefono ?? null,
        estado:   true,
      });
      await clienteRepo.save(cliente);
    }

    const hash    = await bcrypt.hash(clave, 10);
    const usuario = usuarioRepo.create({ correo, clave: hash, role: rolCliente, estado: true });
    await usuarioRepo.save(usuario);

    res.status(201).json({
      success: true,
      message: "Cuenta creada exitosamente",
      data: { id_cliente: cliente.id_cliente, nombre: cliente.nombre, correo: cliente.correo },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error al registrar cuenta", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/login
//  Body: { correo, clave }
//  El token incluye id_cliente (null si es Admin/Empleado sin Cliente asociado)
//  El frontend usa "role" para redirigir:
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

    const usuarioRepo = AppDataSource.getRepository(User);
    const clienteRepo = AppDataSource.getRepository(Client);

    // Buscar usuario (seguridad)
    const usuario = await usuarioRepo.findOne({
      where:     { correo },
      relations: ["role"],
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
        id_rol:     usuario.role?.id_rol,
        rol:        usuario.role?.nombre,
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
        rol:        usuario.role?.nombre,
        id_cliente,
        nombre:     cliente?.nombre ?? null,
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error en login", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/recover
//  Body: { correo }
//  Genera token de recuperación y envía email
// ─────────────────────────────────────────────────────────────────────────────
export const recover = async (req: Request, res: Response): Promise<void> => {
  try {
    const { correo } = req.body;

    if (!correo) {
      res.status(400).json({ success: false, message: "El correo es requerido" });
      return;
    }

    const usuarioRepo = AppDataSource.getRepository(User);
    const usuario = await usuarioRepo.findOne({ where: { correo } });

    if (!usuario) {
      res.json({ success: true, message: "Si el correo existe, recibirás un enlace de recuperación" });
      return;
    }

    console.log("1️⃣ Usuario encontrado, generando token...");

    const token  = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    usuario.token_recuperacion = hashToken(token);
    usuario.token_expira       = expira;
    await usuarioRepo.save(usuario);

    console.log("2️⃣ Token guardado en BD (hash SHA-256), enviando email...");

    await sendRecoveryEmail(correo, token);

    console.log("3️⃣ Email enviado, respondiendo...");

    res.json({ success: true, message: "Si el correo existe, recibirás un enlace de recuperación" });

  } catch (error) {
    console.error("❌ Error en recover:", error);
    res.status(500).json({ success: false, message: "Error al procesar solicitud", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/reenviar-codigo
//  Body: { correo }
//  Idempotente: si el token aún no expiró, reenvía el mismo; si no, genera uno nuevo
// ─────────────────────────────────────────────────────────────────────────────
export const resendCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { correo } = req.body;

    if (!correo) {
      res.status(400).json({ success: false, message: "El correo es requerido" });
      return;
    }

    const usuarioRepo = AppDataSource.getRepository(User);
    const usuario = await usuarioRepo.findOne({ where: { correo } });

    // Respuesta genérica para no revelar si el correo existe
    const okResponse = { success: true, message: "Si el correo existe, recibirás el código" };

    if (!usuario) {
      res.json(okResponse);
      return;
    }

    // Siempre generamos nuevo token: no podemos recuperar el plaintext desde el hash almacenado
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    usuario.token_recuperacion = hashToken(token);
    usuario.token_expira       = new Date(Date.now() + 15 * 60 * 1000);
    await usuarioRepo.save(usuario);

    await sendRecoveryEmail(correo, token);

    res.json(okResponse);

  } catch (error) {
    console.error("❌ Error en resendCode:", error);
    res.status(500).json({ success: false, message: "Error al reenviar código", error });
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

    const usuarioRepo = AppDataSource.getRepository(User);
    const usuario     = await usuarioRepo.findOne({
      where: { token_recuperacion: hashToken(token) },
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