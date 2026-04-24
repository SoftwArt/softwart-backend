import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";

const ADMIN = { correo: "admin@softwart.com", clave: "Admin1234!" };
const NEW_USER = {
  tipoDocumento: "CC",
  documento: "12345678",
  nombre: "Test User",
  correo: "testauth@test.com",
  clave: "Test1234!",
  telefono: "3001234567",
};

describe("POST /api/auth/login", () => {
  it("returns 200 and token with valid admin credentials", async () => {
    const res = await request(app).post("/api/auth/login").send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.data.correo).toBe(ADMIN.correo);
    expect(res.body.data.rol).toBe("Admin");
  });

  it("returns 401 with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ correo: ADMIN.correo, clave: "wrongpassword" });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 with non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ correo: "nobody@test.com", clave: "anypass" });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 422 when clave is missing (Zod validation)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ correo: "admin@softwart.com" });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/auth/register", () => {
  it("creates a new client user and returns 201", async () => {
    const res = await request(app).post("/api/auth/register").send(NEW_USER);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.correo).toBe(NEW_USER.correo);
  });

  it("returns 409 when email is already registered", async () => {
    const res = await request(app).post("/api/auth/register").send(NEW_USER);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("returns 422 when required fields are missing (Zod validation)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ correo: "incomplete@test.com" });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("allows the registered user to login with role Cliente", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ correo: NEW_USER.correo, clave: NEW_USER.clave });
    expect(res.status).toBe(200);
    expect(res.body.data.rol).toBe("Cliente");
  });
});
