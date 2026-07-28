import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app";
import { AppDataSource } from "../../data-source";
import "../setup";

const ADMIN = { correo: "admin@softwart.com", clave: "Admin1234!" };
const NEW_USER = {
  tipoDocumento: "CC",
  documento: "12345678",
  nombre: "Test User",
  correo: "testauth@test.com",
  clave: "Test1234!",
  telefono: "3001234567",
  acceptTerms: true,
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

  it("returns the same 401 + generic message for an inactive account (anti-enumeration)", async () => {
    const adminToken = (await request(app).post("/api/auth/login").send(ADMIN)).body.token;
    const INACTIVE_USER = { correo: "inactivo@test.com", clave: "Inactivo1234!" };

    const created = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(INACTIVE_USER);
    await request(app)
      .patch(`/api/users/${created.body.data.id_usuario}/estado`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Con la clave correcta pero cuenta inactiva: mismo 401 + mismo mensaje
    // que clave incorrecta / correo inexistente — antes era 403 "Cuenta
    // inactiva", un mensaje distinguible que permitía enumerar qué correos
    // existen y están desactivados sin necesitar la clave real.
    const res = await request(app).post("/api/auth/login").send(INACTIVE_USER);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Credenciales inválidas");

    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ correo: ADMIN.correo, clave: "wrongpassword" });
    expect(res.status).toBe(wrongPassword.status);
    expect(res.body.message).toBe(wrongPassword.body.message);
  });
});

describe("POST /api/auth/register", () => {
  it("creates a new client user and returns 201", async () => {
    const res = await request(app).post("/api/auth/register").send(NEW_USER);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.correo).toBe(NEW_USER.correo);
  });

  it("registers the acceptance of both legal documents atomically (ADR-007)", async () => {
    const correo = "aceptacion@test.com";
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...NEW_USER, correo, documento: "99999999" });
    expect(res.status).toBe(201);

    const filas = await AppDataSource.query(
      `SELECT tipo_documento, evento, version FROM aceptacion_legal WHERE correo_titular = $1`,
      [correo],
    );
    expect(filas).toHaveLength(2);
    const tipos = filas.map((f: { tipo_documento: string }) => f.tipo_documento).sort();
    expect(tipos).toEqual(["POLITICA_PRIVACIDAD", "TERMINOS_SERVICIO"]);
    for (const fila of filas) {
      expect(fila.evento).toBe("ACEPTACION");
      expect(fila.version).toBeTruthy();
    }
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

  it("returns 422 when acceptTerms is false or missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...NEW_USER, correo: "sinaceptar@test.com", acceptTerms: false });
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

  it("reutiliza el Cliente existente por documento (creado como invitado) aunque el correo cambie", async () => {
    const documento = "77770001";
    const correoInvitado = "invitado.reutiliza@test.com";
    const correoRegistro = "registro.reutiliza@test.com";

    const guestRes = await request(app).post("/api/auth/guest-appointment").send({
      tipoDocumento: "CC", documento, nombre: "Cliente Invitado Reutilizado",
      correo: correoInvitado, telefono: "3009998877",
      fecha: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      hora: "13:00", acceptTerms: true,
    });
    expect(guestRes.status).toBe(201);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...NEW_USER, documento, correo: correoRegistro });
    expect(res.status).toBe(201);

    const clientes = await AppDataSource.query(
      `SELECT id_cliente, correo FROM cliente WHERE documento = $1`,
      [documento],
    );
    expect(clientes).toHaveLength(1); // no duplicó el Cliente del invitado
    expect(clientes[0].correo).toBe(correoRegistro); // correo actualizado al de la cuenta

    // User.correo y Client.correo deben coincidir para que login() vincule
    // el cliente correcto (ver AuthController.login, búsqueda por correo).
    const login = await request(app)
      .post("/api/auth/login")
      .send({ correo: correoRegistro, clave: NEW_USER.clave });
    expect(login.status).toBe(200);
    expect(login.body.data.id_cliente).toBe(clientes[0].id_cliente);
  });

  it("returns 409 when the correo being registered already belongs to a different client", async () => {
    const documentoOtro = "77770003";
    const correoOtro = "otro.cliente.registro@test.com";
    const guestRes = await request(app).post("/api/auth/register-guest").send({
      tipoDocumento: "CC", documento: documentoOtro, nombre: "Otro Cliente", correo: correoOtro,
      telefono: "3001112233",
    });
    expect(guestRes.status).toBe(201);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...NEW_USER, documento: "77770004", correo: correoOtro });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/register-guest", () => {
  it("crea el Cliente sin telefono (campo opcional en el schema)", async () => {
    const res = await request(app).post("/api/auth/register-guest").send({
      tipoDocumento: "CC",
      documento: "66660001",
      nombre: "Cliente Sin Telefono",
      correo: "sintelefono@test.com",
    });
    expect(res.status).toBe(201);

    const clientes = await AppDataSource.query(
      `SELECT telefono FROM cliente WHERE correo = $1`,
      ["sintelefono@test.com"],
    );
    expect(clientes).toHaveLength(1);
    expect(clientes[0].telefono).toBeNull();
  });
});
