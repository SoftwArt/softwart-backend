import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { User } from "../../models/User";

// Ni Zod ni UserController (createUser/updateUser) validaban correo duplicado —
// el único guard era el `unique` de la columna en BD, que devuelve un 500 crudo
// de Postgres en vez de un 409 legible. Mismo criterio ya usado en
// ClientController (createClient/updateClient) para documento/correo.

let adminToken: string;
let existingUserId: number;
let otherUserId: number;

beforeAll(async () => {
  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;

  const usuarioRepo = AppDataSource.getRepository(User);
  const existing = await usuarioRepo.save(
    usuarioRepo.create({ correo: "duplicado@test.com", clave: "hash-no-importa", estado: true }),
  );
  existingUserId = existing.id_usuario;

  const other = await usuarioRepo.save(
    usuarioRepo.create({ correo: "otro-usuario@test.com", clave: "hash-no-importa", estado: true }),
  );
  otherUserId = other.id_usuario;
});

describe("POST /api/users — correo duplicado", () => {
  it("returns 409 when the correo already belongs to another user", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ correo: "duplicado@test.com", clave: "Password123!" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    const count = await AppDataSource.getRepository(User).count({ where: { correo: "duplicado@test.com" } });
    expect(count).toBe(1); // no se creó un segundo registro
  });

  it("creates the user when the correo is not taken", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ correo: "correo-nuevo@test.com", clave: "Password123!" });

    expect(res.status).toBe(201);
  });
});

describe("PUT /api/users/:id — correo duplicado", () => {
  it("returns 409 when trying to change to a correo another user already has", async () => {
    const res = await request(app)
      .put(`/api/users/${otherUserId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ correo: "duplicado@test.com" });

    expect(res.status).toBe(409);

    const other = await AppDataSource.getRepository(User).findOneBy({ id_usuario: otherUserId });
    expect(other!.correo).toBe("otro-usuario@test.com"); // no cambió
  });

  it("allows saving the user's own unchanged correo", async () => {
    const res = await request(app)
      .put(`/api/users/${existingUserId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ correo: "duplicado@test.com" });

    expect(res.status).toBe(200);
  });
});
