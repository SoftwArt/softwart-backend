import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";
import { AppDataSource } from "../../data-source";
import "../setup";

const ADMIN = { correo: "admin@softwart.com", clave: "Admin1234!" };

async function login() {
  const res = await request(app).post("/api/auth/login").send(ADMIN);
  return res.body as { token: string; refreshToken: string };
}

describe("POST /api/auth/login — sliding expiration", () => {
  it("returns both token and refreshToken", async () => {
    const res = await request(app).post("/api/auth/login").send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });
});

describe("POST /api/auth/refresh", () => {
  it("returns 200 with a new token pair for a valid refresh token", async () => {
    const { refreshToken } = await login();
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.data.correo).toBe(ADMIN.correo);
  });

  it("the new access token works against a verifyToken-protected route", async () => {
    const { refreshToken } = await login();
    const refreshed = await request(app).post("/api/auth/refresh").send({ refreshToken });
    const res = await request(app)
      .get("/api/auth/me/permissions")
      .set("Authorization", `Bearer ${refreshed.body.token}`);
    expect(res.status).toBe(200);
  });

  it("returns 401 for an already-rotated (old) refresh token", async () => {
    const { refreshToken } = await login();
    await request(app).post("/api/auth/refresh").send({ refreshToken }); // rota
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken }); // reusa el viejo
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for a token that was never issued", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "a".repeat(64) });
    expect(res.status).toBe(401);
  });

  it("returns 401 for an expired refresh token", async () => {
    const { refreshToken } = await login();
    await AppDataSource.query(
      `UPDATE usuario SET refresh_token_expira = now() - interval '1 minute' WHERE correo = $1`,
      [ADMIN.correo],
    );
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it("returns 422 when refreshToken is missing (Zod validation)", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("supports chained rotation — refreshing twice in a row works", async () => {
    const { refreshToken } = await login();
    const first = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(first.status).toBe(200);
    const second = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: first.body.refreshToken });
    expect(second.status).toBe(200);
    // el primer refreshToken (ya rotado por el primer refresh) sigue muerto
    const reuseFirst = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(reuseFirst.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("returns 401 without an Authorization header", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(401);
  });

  it("invalidates the refresh token server-side", async () => {
    const { token, refreshToken } = await login();
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    const refreshRes = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });

  it("login again after logout still works and issues a fresh working pair", async () => {
    const { token } = await login();
    await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);

    const { token: newToken, refreshToken: newRefreshToken } = await login();
    expect(newToken).toBeDefined();
    expect(newRefreshToken).toBeDefined();

    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: newRefreshToken });
    expect(res.status).toBe(200);
  });
});
