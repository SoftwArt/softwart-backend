// ─────────────────────────────────────────────────────────────────────────────
//  src/data-source.ts
//  Fuente única de verdad para TypeORM.
//  Importa AppDataSource desde aquí en controllers, seeds y app.ts.
// ─────────────────────────────────────────────────────────────────────────────

import "reflect-metadata";
import * as dotenv from "dotenv";
dotenv.config();

import { DataSource } from "typeorm";

import { Permission }        from "./models/Permission";
import { Role }              from "./models/Role";
import { RolePermission }    from "./models/RolePermission";
import { User }              from "./models/User";
import { Client }            from "./models/Client";
import { Service }           from "./models/Service";
import { AppointmentStatus } from "./models/AppointmentStatus";
import { ServiceStatus }     from "./models/ServiceStatus";
import { PaymentMethod }     from "./models/PaymentMethod";
import { PaymentStatus }     from "./models/PaymentStatus";
import { Appointment }       from "./models/Appointment";
import { Frame }             from "./models/Frame";
import { Sale }              from "./models/Sale";
import { SaleDetail }        from "./models/SaleDetail";
import { ServiceStatusHistory } from "./models/ServiceStatusHistory";
import { Payment }           from "./models/Payment";

const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const entities = [
  Permission, Role, RolePermission, User,
  Client,
  Service, AppointmentStatus, ServiceStatus, PaymentMethod, PaymentStatus,
  Appointment, Frame, Sale, SaleDetail, ServiceStatusHistory,
  Payment,
];

const migrations = isTest ? [] : [__dirname + "/migrations/*.{ts,js}"];

export const AppDataSource = isProd
  // ─────────────────────────────────────────────────────────────────────────
  //  PRODUCCIÓN — Supabase via DATABASE_URL (Session Pooler)
  // ─────────────────────────────────────────────────────────────────────────
  ? new DataSource({
      type:        "postgres",
      url:         process.env.DATABASE_URL,
      synchronize: false,
      logging:     false,
      ssl: {
        rejectUnauthorized: false,  // requerido por Supabase Session Pooler
      },
      entities,
      migrations,
      migrationsTableName: "typeorm_migrations",
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
      dropSchema:  isTest,
      logging:     !isTest,
      entities,
      migrations,
      migrationsTableName: "typeorm_migrations",
    });
