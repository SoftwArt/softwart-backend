import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app";
import { AppDataSource } from "../../data-source";
import "../setup";

const ADMIN = { correo: "admin@softwart.com", clave: "Admin1234!" };
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const documentBase = Number(String(Date.now()).slice(-8));

async function adminToken(): Promise<string> {
  const res = await request(app).post("/api/auth/login").send(ADMIN);
  return res.body.token;
}

function clientPayload(overrides: Record<string, unknown> = {}) {
  return {
    tipoDocumento: "CC",
    documento: String(documentBase).padStart(10, "0"),
    nombre: "Cliente Admin Integracion",
    correo: `cliente-admin-${suffix}@test.com`,
    telefono: "3001234567",
    acceptToS: true,
    acceptPrivacy: true,
    ...overrides,
  };
}

describe("Admin client account flow", () => {
  it("creates Client, User role 2, welcome token and both legal acceptances atomically", async () => {
    const token = await adminToken();
    const payload = clientPayload();
    const res = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(201);

    const [client] = await AppDataSource.query(
      `SELECT id_cliente, correo FROM cliente WHERE correo = $1`,
      [payload.correo],
    );
    const [user] = await AppDataSource.query(
      `SELECT correo, id_rol, clave, token_recuperacion, token_expira
         FROM usuario WHERE correo = $1`,
      [payload.correo],
    );
    const acceptances = await AppDataSource.query(
      `SELECT tipo_documento, contexto, id_usuario_actor
         FROM aceptacion_legal WHERE id_cliente = $1`,
      [client.id_cliente],
    );

    expect(client.correo).toBe(payload.correo);
    expect(user.id_rol).toBe(2);
    expect(user.clave).not.toBe(payload.correo);
    expect(user.clave).toMatch(/^\$2/);
    expect(user.token_recuperacion).toMatch(/^[0-9a-f]{64}$/);
    expect(new Date(user.token_expira).getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
    expect(acceptances).toHaveLength(2);
    expect(acceptances.map((row: { tipo_documento: string }) => row.tipo_documento).sort())
      .toEqual(["POLITICA_PRIVACIDAD", "TERMINOS_SERVICIO"]);
    expect(acceptances.every((row: { contexto: string }) => row.contexto === "REGISTRO_ADMIN")).toBe(true);
    expect(acceptances.every((row: { id_usuario_actor: number }) => row.id_usuario_actor === 1)).toBe(true);
  });

  it("requires both legal acceptances", async () => {
    const token = await adminToken();
    const res = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${token}`)
      .send(clientPayload({ correo: `sin-legal-${suffix}@test.com`, acceptPrivacy: false }));

    expect(res.status).toBe(422);
  });

  it("synchronizes email when edited from Client or User", async () => {
    const token = await adminToken();
    const original = clientPayload({
      documento: String(documentBase + 1).padStart(10, "0"),
      correo: `sync-original-${suffix}@test.com`,
    });
    const created = await request(app)
      .post("/api/clients")
      .set("Authorization", `Bearer ${token}`)
      .send(original);
    const idCliente = created.body.data.id_cliente;

    const fromClient = `sync-client-${suffix}@test.com`;
    const clientUpdate = await request(app)
      .put(`/api/clients/${idCliente}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ correo: fromClient });
    expect(clientUpdate.status).toBe(200);

    const [afterClient] = await AppDataSource.query(
      `SELECT c.correo AS cliente_correo, u.correo AS usuario_correo
         FROM cliente c LEFT JOIN usuario u ON u.correo = c.correo
        WHERE c.id_cliente = $1`,
      [idCliente],
    );
    expect(afterClient.cliente_correo).toBe(fromClient);
    expect(afterClient.usuario_correo).toBe(fromClient);

    const [user] = await AppDataSource.query(
      `SELECT id_usuario FROM usuario WHERE correo = $1`,
      [fromClient],
    );
    const fromUser = `sync-user-${suffix}@test.com`;
    const userUpdate = await request(app)
      .put(`/api/users/${user.id_usuario}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ correo: fromUser });
    expect(userUpdate.status).toBe(200);

    const [afterUser] = await AppDataSource.query(
      `SELECT c.correo AS cliente_correo, u.correo AS usuario_correo
         FROM cliente c LEFT JOIN usuario u ON u.correo = c.correo
        WHERE c.id_cliente = $1`,
      [idCliente],
    );
    expect(afterUser.cliente_correo).toBe(fromUser);
    expect(afterUser.usuario_correo).toBe(fromUser);
  });

  it("rejects duplicate synchronized email without partial changes", async () => {
    const token = await adminToken();
    const first = clientPayload({
      documento: String(documentBase + 2).padStart(10, "0"),
      correo: `sync-first-${suffix}@test.com`,
    });
    const second = clientPayload({
      documento: String(documentBase + 3).padStart(10, "0"),
      correo: `sync-second-${suffix}@test.com`,
    });
    const firstRes = await request(app).post("/api/clients").set("Authorization", `Bearer ${token}`).send(first);
    const secondRes = await request(app).post("/api/clients").set("Authorization", `Bearer ${token}`).send(second);

    const res = await request(app)
      .put(`/api/clients/${secondRes.body.data.id_cliente}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ correo: first.correo });

    expect(res.status).toBe(409);
    const [client] = await AppDataSource.query(
      `SELECT correo FROM cliente WHERE id_cliente = $1`,
      [secondRes.body.data.id_cliente],
    );
    expect(client.correo).toBe(second.correo);
    expect(firstRes.status).toBe(201);
  });
});
