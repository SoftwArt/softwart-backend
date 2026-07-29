// src/controllers/AuthController.ts
import { Request, Response } from "express";
import { AppDataSource }     from "../data-source";
import { User }               from "../models/User";
import { Client }            from "../models/Client";
import { Role }              from "../models/Role";
import { Appointment }       from "../models/Appointment";
import jwt                   from "jsonwebtoken";
import bcrypt                from "bcrypt";
import crypto                from "crypto";

import { hashToken } from "../helpers/inviteToken.helper";
import { sendRecoveryEmail } from "../services/email.service";
import { logger } from "../config/logger";
import { insertarAceptacionesLegales } from "../helpers/legalAcceptance.helper";
import { ContextoAceptacion } from "../models/LegalAcceptance";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET no definida — el servidor no puede arrancar");

// Sliding expiration: access token corto (verificado en cada request por
// verifyToken) + refresh token opaco de vida más larga que se rota en cada
// uso — mientras el usuario esté activo, /api/auth/refresh lo va extendiendo
// otras REFRESH_TTL_MS sin que la sesión visible expire nunca.
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TTL_MS   = 8 * 60 * 60 * 1000; // 8h de inactividad

// Firma el access token + genera y persiste un refresh token nuevo (rota el
// anterior). Usado tanto por login como por refreshToken — única fuente de
// verdad para no repetir la lógica de emisión en dos lugares.
const issueTokenPair = async (
  usuario: User,
  id_cliente: number | null,
): Promise<{ token: string; refreshToken: string }> => {
  const token = jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      correo:     usuario.correo,
      id_rol:     usuario.role?.id_rol,
      rol:        usuario.role?.nombre,
      id_cliente,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  // Mismo patrón que recover/resendCode: token de alta entropía, solo se
  // guarda el hash SHA-256 — el plaintext nunca toca la BD.
  const refreshToken = crypto.randomBytes(32).toString("hex");
  usuario.refresh_token_hash   = hashToken(refreshToken);
  usuario.refresh_token_expira = new Date(Date.now() + REFRESH_TTL_MS);
  await AppDataSource.getRepository(User).save(usuario);

  return { token, refreshToken };
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/auth/me/permissions  (requiere JWT)
//  Devuelve los nombres de permisos asignados al rol del usuario autenticado.
//  Usado por el sidebar para filtrar items según permisos del empleado.
// ─────────────────────────────────────────────────────────────────────────────
export const myPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_rol = req.user?.id_rol;
    const rows: { nombre: string }[] = await AppDataSource.query(
      `SELECT p.nombre FROM permiso_rol pr INNER JOIN permiso p ON pr.id_permiso = p.id_permiso WHERE pr.id_rol = $1`,
      [id_rol]
    );
    res.json({ success: true, data: rows.map(r => r.nombre) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener permisos", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/auth/availability?fecha=YYYY-MM-DD
//  Pública — devuelve slots ocupados (solo hora + id_cita, sin datos de cliente)
// ─────────────────────────────────────────────────────────────────────────────
export const publicAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fecha } = req.query;
    if (!fecha || typeof fecha !== "string") {
      res.status(400).json({ success: false, message: "El parámetro 'fecha' es requerido" });
      return;
    }
    // Cancelada/No Asistió liberan el slot — solo Pendiente/Confirmada/Completada
    // siguen "ocupando" esa hora.
    const citas = await AppDataSource.getRepository(Appointment)
      .createQueryBuilder("c")
      .innerJoin("c.appointmentStatus", "es")
      .select(["c.id_cita", "c.hora"])
      .where("CAST(c.fecha AS DATE) = :fecha", { fecha })
      .andWhere("LOWER(es.nombre) NOT IN ('cancelada', 'no asistió')")
      .getMany();

    res.json({ success: true, data: citas.map(c => ({ id_cita: c.id_cita, hora: c.hora })) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al consultar disponibilidad", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/register
//  Landing página registrar — crea Cliente + Usuario en una sola llamada.
//  Estricto: si ya existe un Cliente con ese documento O ese correo, se
//  bloquea con 409 — nunca se reutiliza ni se actualiza nada en silencio.
//  Body: { tipoDocumento, documento, nombre, correo, clave, telefono }
// ─────────────────────────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioRepo = AppDataSource.getRepository(User);
    const clienteRepo = AppDataSource.getRepository(Client);
    const rolRepo     = AppDataSource.getRepository(Role);

    const { tipoDocumento, documento, nombre, correo, clave, telefono } = req.body;

    const [usuarioExiste, clienteConEseDocumento, clienteConEseCorreo] = await Promise.all([
      usuarioRepo.findOne({ where: { correo } }),
      clienteRepo.findOne({ where: { documento } }),
      clienteRepo.findOne({ where: { correo } }),
    ]);

    if (usuarioExiste) {
      res.status(409).json({ success: false, message: "Ya existe una cuenta con ese correo" });
      return;
    }
    if (clienteConEseDocumento) {
      res.status(409).json({ success: false, message: "Ya existe un registro con ese número de documento" });
      return;
    }
    if (clienteConEseCorreo) {
      res.status(409).json({ success: false, message: "Ese correo ya está en uso por otro cliente" });
      return;
    }

    const rolCliente = await rolRepo.findOne({ where: { nombre: "Cliente" } });
    if (!rolCliente) {
      res.status(500).json({ success: false, message: "Rol 'Cliente' no configurado en el sistema" });
      return;
    }

    // Cliente + Usuario + las 2 filas de aceptación legal (ToS y PyP) nacen
    // en la misma transacción — ADR-007 §6: "Un cliente sin constancia de
    // autorización es un estado inválido del sistema".
    let cliente!: Client;
    await AppDataSource.transaction(async (manager) => {
      const clienteRepoTx = manager.getRepository(Client);
      cliente = clienteRepoTx.create({
        tipoDocumento,
        documento,
        nombre,
        correo,
        telefono: telefono ?? null,
        estado:   true,
      });
      await clienteRepoTx.save(cliente);

      const hash    = await bcrypt.hash(clave, 10);
      const usuario = manager.getRepository(User).create({ correo, clave: hash, role: rolCliente, estado: true });
      await manager.getRepository(User).save(usuario);

      await insertarAceptacionesLegales(manager, {
        id_cliente:        cliente.id_cliente,
        documento_titular: cliente.documento,
        correo_titular:    cliente.correo,
        contexto:          ContextoAceptacion.REGISTRO,
        ip:                req.ip ?? null,
        user_agent:        req.headers["user-agent"] ?? null,
      });
    });

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
//  El token incluye id_cliente (null si es Admin sin Cliente asociado)
//  El frontend usa "role" para redirigir:
//    "Admin"    → panel admin  (PrivateRoute React)
//    "Cliente"  → landing / mis citas
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
      logger.warn({ correo, ip: req.ip, motivo: "usuario inexistente" }, "login fallido");
      res.status(401).json({ success: false, message: "Credenciales inválidas" });
      return;
    }

    // Cuenta inactiva se valida DESPUÉS de la clave, con el mismo 401 +
    // mensaje genérico que clave incorrecta / correo inexistente — antes
    // devolvía 403 "Cuenta inactiva" antes de siquiera comparar la clave,
    // lo que permitía enumerar qué correos existen y están desactivados
    // (OWASP A01) sin necesitar la clave real, y además revelaba el motivo
    // exacto del rechazo al frontend.
    const claveValida = await bcrypt.compare(clave, usuario.clave);
    if (!claveValida || !usuario.estado) {
      logger.warn(
        { correo, ip: req.ip, motivo: !claveValida ? "clave incorrecta" : "cuenta inactiva" },
        "login fallido",
      );
      res.status(401).json({ success: false, message: "Credenciales inválidas" });
      return;
    }

    // Buscar si tiene Cliente asociado por correo
    const cliente    = await clienteRepo.findOne({ where: { correo } });
    const id_cliente = cliente?.id_cliente ?? null;

    const { token, refreshToken } = await issueTokenPair(usuario, id_cliente);

    res.json({
      success: true,
      message: "Bienvenido",
      token,
      refreshToken,
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
//  POST /api/auth/refresh
//  Body: { refreshToken }
//  Rota el refresh token (el anterior queda inválido) y emite un access token
//  nuevo — sliding expiration: cada llamada exitosa extiende la sesión otras
//  8h de inactividad sin que el usuario tenga que volver a loguearse.
// ─────────────────────────────────────────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: incoming } = req.body;

    const usuarioRepo = AppDataSource.getRepository(User);
    const usuario = await usuarioRepo.findOne({
      where:     { refresh_token_hash: hashToken(incoming) },
      relations: ["role"],
    });

    const expirado = usuario?.refresh_token_expira != null && usuario.refresh_token_expira < new Date();

    if (!usuario || expirado || !usuario.estado) {
      res.status(401).json({ success: false, message: "Sesión expirada, inicia sesión nuevamente" });
      return;
    }

    const clienteRepo = AppDataSource.getRepository(Client);
    const cliente     = await clienteRepo.findOne({ where: { correo: usuario.correo } });
    const id_cliente  = cliente?.id_cliente ?? null;

    const { token, refreshToken: nuevoRefreshToken } = await issueTokenPair(usuario, id_cliente);

    res.json({
      success: true,
      message: "Token renovado",
      token,
      refreshToken: nuevoRefreshToken,
      data: {
        id_usuario: usuario.id_usuario,
        correo:     usuario.correo,
        rol:        usuario.role?.nombre,
        id_cliente,
        nombre:     cliente?.nombre ?? null,
      },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error al renovar la sesión", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/logout  (requiere JWT — verifyToken)
//  Invalida el refresh token del usuario autenticado del lado del servidor.
//  Requiere un access token válido a propósito: alguien que solo robó un
//  refresh token (sin el access token) no puede cerrarle la sesión a otro.
// ─────────────────────────────────────────────────────────────────────────────
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioRepo = AppDataSource.getRepository(User);
    const usuario = await usuarioRepo.findOneBy({ id_usuario: req.user!.id_usuario });
    if (usuario) {
      usuario.refresh_token_hash   = null;
      usuario.refresh_token_expira = null;
      await usuarioRepo.save(usuario);
    }
    res.json({ success: true, message: "Sesión cerrada" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cerrar sesión", error });
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

    logger.info({ correo }, "solicitud de recuperación — generando token");

    // A02 — token de alta entropía (256 bits): al hashearlo con SHA-256 es
    // imposible de revertir si se filtra la BD. Reemplaza al código de 6 dígitos
    // (baja entropía, brute-forceable desde el hash). Viaja en el link del email.
    const token  = crypto.randomBytes(32).toString("hex");
    const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    usuario.token_recuperacion = hashToken(token);
    usuario.token_expira       = expira;
    await usuarioRepo.save(usuario);

    logger.info({ correo }, "token de recuperación guardado (hash SHA-256), enviando email");

    await sendRecoveryEmail(correo, token);

    res.json({ success: true, message: "Si el correo existe, recibirás un enlace de recuperación" });

  } catch (error) {
    logger.error({ err: error }, "error en recover");
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
    const token = crypto.randomBytes(32).toString("hex");
    usuario.token_recuperacion = hashToken(token);
    usuario.token_expira       = new Date(Date.now() + 15 * 60 * 1000);
    await usuarioRepo.save(usuario);

    await sendRecoveryEmail(correo, token);

    res.json(okResponse);

  } catch (error) {
    logger.error({ err: error }, "error en resendCode");
    res.status(500).json({ success: false, message: "Error al reenviar código", error });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/auth/validate-reset-token?token=...
//  Chequeo de solo-lectura (no consume el token) para que ResetPasswordPage
//  avise de inmediato si el link ya expiró, en vez de que el usuario lo
//  descubra recién al llenar el formulario y darle submit.
// ─────────────────────────────────────────────────────────────────────────────
export const validateResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) {
      res.json({ success: true, data: { valid: false, expired: false } });
      return;
    }

    const usuarioRepo = AppDataSource.getRepository(User);
    const usuario = await usuarioRepo.findOne({
      where: { token_recuperacion: hashToken(token) },
    });

    if (!usuario || !usuario.token_expira) {
      res.json({ success: true, data: { valid: false, expired: false } });
      return;
    }

    const expired = usuario.token_expira < new Date();
    res.json({ success: true, data: { valid: !expired, expired } });

  } catch (error) {
    res.status(500).json({ success: false, message: "Error al validar el enlace", error });
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