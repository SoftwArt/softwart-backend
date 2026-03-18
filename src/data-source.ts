// ─────────────────────────────────────────────────────────────────────────────
//  src/data-source.ts
//  Fuente única de verdad para TypeORM.
//  Importa AppDataSource desde aquí en controllers, seeds y app.ts.
// ─────────────────────────────────────────────────────────────────────────────

import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import { DataSource } from "typeorm";

import { Permiso }        from "./models/Permiso";
import { Rol }            from "./models/Rol";
import { PermisoRol }     from "./models/PermisoRol";
import { Usuario }        from "./models/Usuario";
import { Cliente }        from "./models/Cliente";
import { Servicio }       from "./models/Servicio";
import { EstadoCita }     from "./models/EstadoCita";
import { EstadoServicio } from "./models/EstadoServicio";
import { MetodoPago }     from "./models/MetodoPago";
import { EstadoPago }     from "./models/EstadoPago";
import { Cita }           from "./models/Cita";
import { Marco }          from "./models/Marco";
import { Venta }          from "./models/Venta";
import { DetalleVenta }   from "./models/DetalleVenta";
import { Pago }           from "./models/Pago";

const isProd = process.env.NODE_ENV === "production";

const entities = [
  Permiso, Rol, PermisoRol, Usuario,
  Cliente,
  Servicio, EstadoCita, EstadoServicio, MetodoPago, EstadoPago,
  Cita, Marco, Venta, DetalleVenta,
  Pago,
];

export const AppDataSource = isProd
  // ─────────────────────────────────────────────────────────────────────────
  //  PRODUCCIÓN — Supabase via DATABASE_URL (Session Pooler)
  // ─────────────────────────────────────────────────────────────────────────
  ? new DataSource({
      type:        "postgres",
      url:         process.env.DATABASE_URL,
      synchronize: true,   // mientras no haya migraciones generadas
      logging:     false,
      ssl: {
        rejectUnauthorized: false,  // requerido por Supabase Session Pooler
      },
      entities,
    })
  // ─────────────────────────────────────────────────────────────────────────
  //  DESARROLLO — PostgreSQL local
  // ─────────────────────────────────────────────────────────────────────────
  : new DataSource({
      type:        "postgres",
      host:        process.env.DB_HOST     ?? "localhost",
      port:        Number(process.env.DB_PORT ?? 5432),
      username:    process.env.DB_USER     ?? "root",
      password:    process.env.DB_PASSWORD ?? "",
      database:    process.env.DB_NAME     ?? "mi_base_de_datos",
      synchronize: true,
      logging:     true,
      entities,
    });
