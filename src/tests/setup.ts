import { beforeAll } from "vitest";
import { Client as PgClient } from "pg";
import { AppDataSource } from "../data-source";
import { runAllSeeds } from "../seeds";

beforeAll(async () => {
  // Create softwart_test database if it doesn't exist
  const pgAdmin = new PgClient({
    host:     process.env.DB_HOST     ?? "localhost",
    port:     Number(process.env.DB_PORT ?? 5432),
    user:     process.env.DB_USER     ?? "softwart",
    password: process.env.DB_PASSWORD ?? "softwart",
    database: "softwart-db",
  });
  await pgAdmin.connect();
  await pgAdmin.query("CREATE DATABASE softwart_test").catch(() => {});
  await pgAdmin.end();

  await AppDataSource.initialize();
  await runAllSeeds();
}, 60000);
