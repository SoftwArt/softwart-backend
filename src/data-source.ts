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

// ─────────────────────────────────────────────────────────────────────────────
//  DESARROLLO  (PostgreSQL)
//  Renombra o comenta este bloque cuando vayas a producción.
// ─────────────────────────────────────────────────────────────────────────────

export const AppDataSource = new DataSource({
  type:        "postgres",
  host:        process.env.DB_HOST     ?? "localhost",
  port:        Number(process.env.DB_PORT ?? 5432),
  username:    process.env.DB_USER     ?? "root",
  password:    process.env.DB_PASSWORD ?? "",
  database:    process.env.DB_NAME     ?? "mi_base_de_datos",
  synchronize: true,   // ✅ OK en dev — crea/actualiza tablas automáticamente
  logging:     true,   // muestra las queries en consola
  entities: [
    Permiso, Rol, PermisoRol, Usuario,
    Cliente,
    Servicio, EstadoCita, EstadoServicio, MetodoPago, EstadoPago,
    Cita, Marco, Venta, DetalleVenta,
    Pago,
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
//  PRODUCCIÓN  (Supabase / PostgreSQL en Render)
//  Cuando estés listo para prod:
//    1. Comenta el bloque de DESARROLLO de arriba.
//    2. Descomenta este bloque.
//    3. Ajusta las variables en el dashboard de Render.
// ─────────────────────────────────────────────────────────────────────────────

// export const AppDataSource = new DataSource({
//   type:        "postgres",
//   host:        process.env.DB_HOST,
//   port:        Number(process.env.DB_PORT ?? 5432),
//   username:    process.env.DB_USER,
//   password:    process.env.DB_PASSWORD,
//   database:    process.env.DB_NAME,
//   synchronize: false,   // ❌ nunca en prod → usa migraciones
//   logging:     false,
//   ssl: {
//     rejectUnauthorized: false,  // requerido por Supabase/Render
//   },
//   entities: [
//     Permiso, Rol, PermisoRol, Usuario,
//     Cliente,
//     Servicio, EstadoCita, EstadoServicio, MetodoPago, EstadoPago,
//     Cita, Marco, Venta, DetalleVenta,
//     Pago,
//   ],
//   // migrations: ["dist/migrations/*.js"],  // cuando generes migraciones con TypeORM CLI
// });
