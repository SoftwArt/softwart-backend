import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";

// Evidencia ejecutable de que el control de acceso real por permisos
// (requirePermission, ver requirePermission.middleware.ts) funciona de punta
// a punta — no solo que el catálogo de permisos existe, sino que negarle un
// permiso a un rol de verdad bloquea el endpoint, y dárselo de verdad lo
// habilita. Antes de esto, el sistema entero de Permisos (la matriz rol×permiso
// que se arma en PermissionsPage) no tenía ningún efecto: todo se gateaba por
// requireRol("Admin") sin consultar la tabla permiso_rol.

let adminToken: string;
let testerToken: string;
let testerRolId: number;
let idPermisoClientesVer: number;
let idPermisoPanelAcceso: number;
let idPermisoDashboardVer: number;

beforeAll(async () => {
  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;

  // Rol nuevo, sin ningún permiso todavía.
  const rolRes = await request(app)
    .post("/api/roles")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ nombre: "Tester Permisos" });
  testerRolId = rolRes.body.data.id_rol;

  const permisosRes = await request(app)
    .get("/api/permissions?limit=200")
    .set("Authorization", `Bearer ${adminToken}`);
  const permisos: { id_permiso: number; nombre: string }[] = permisosRes.body.data;
  idPermisoClientesVer = permisos.find((p) => p.nombre === "CLIENTES.VER")!.id_permiso;
  idPermisoPanelAcceso = permisos.find((p) => p.nombre === "PANEL.ACCESO")!.id_permiso;
  idPermisoDashboardVer = permisos.find((p) => p.nombre === "DASHBOARD.VER")!.id_permiso;

  // Usuario con ese rol, sin cuenta de Cliente asociada (Admin-side).
  const userRes = await request(app)
    .post("/api/users")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ correo: "tester.permisos@test.com", clave: "Tester1234!", id_rol: testerRolId });
  expect(userRes.status).toBe(201);

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ correo: "tester.permisos@test.com", clave: "Tester1234!" });
  testerToken = loginRes.body.token;
}, 30000);

describe("requirePermission — control de acceso real por permiso (no por nombre de rol)", () => {
  it("403 en un módulo sin permiso asignado (CLIENTES.VER), con mensaje en lenguaje natural", async () => {
    const res = await request(app).get("/api/clients").set("Authorization", `Bearer ${testerToken}`);
    expect(res.status).toBe(403);
    // Antes: { error: "Forbidden: permiso requerido" } — el frontend no podía
    // leerlo (apiClient.ts busca body.message) y mostraba el fallback "Error 403".
    expect(res.body.success).toBe(false);
    expect(typeof res.body.message).toBe("string");
    expect(res.body.message).not.toMatch(/^Forbidden/i);
    expect(res.body.message.length).toBeGreaterThan(10);
  });

  it("403 en el panel (PANEL.ACCESO) mientras no se lo asignen", async () => {
    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${testerToken}`);
    expect(res.status).toBe(403);
  });

  it("200 en el mismo módulo en cuanto se le asigna el permiso — sin volver a loguearse", async () => {
    const assign = await request(app)
      .post("/api/role-permissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_rol: testerRolId, id_permiso: idPermisoClientesVer });
    expect(assign.status).toBe(201);

    const res = await request(app).get("/api/clients").set("Authorization", `Bearer ${testerToken}`);
    expect(res.status).toBe(200);
  });

  it("sigue en 403 en un módulo distinto (VENTAS.VER) aunque ya tenga CLIENTES.VER", async () => {
    const res = await request(app).get("/api/sales").set("Authorization", `Bearer ${testerToken}`);
    expect(res.status).toBe(403);
  });

  it("403 en /api/dashboard con PANEL.ACCESO pero sin DASHBOARD.VER", async () => {
    const assign = await request(app)
      .post("/api/role-permissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_rol: testerRolId, id_permiso: idPermisoPanelAcceso });
    expect(assign.status).toBe(201);

    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${testerToken}`);
    expect(res.status).toBe(403);
  });

  it("200 en /api/dashboard en cuanto se le asigna DASHBOARD.VER", async () => {
    const assign = await request(app)
      .post("/api/role-permissions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_rol: testerRolId, id_permiso: idPermisoDashboardVer });
    expect(assign.status).toBe(201);

    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${testerToken}`);
    expect(res.status).toBe(200);
  });

  it("403 y no aparece en mis permisos cuando DASHBOARD.VER está inactivo", async () => {
    const permiso = await request(app)
      .get(`/api/permissions/${idPermisoDashboardVer}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(permiso.status).toBe(200);

    const toggle = await request(app)
      .patch(`/api/permissions/${idPermisoDashboardVer}/estado`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(toggle.status).toBe(200);
    expect(toggle.body.data.estado).toBe(false);

    const dashboard = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${testerToken}`);
    expect(dashboard.status).toBe(403);

    const mine = await request(app).get("/api/auth/me/permissions").set("Authorization", `Bearer ${testerToken}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data).not.toContain("DASHBOARD.VER");
  });

  it("401 sin token de autenticación", async () => {
    const res = await request(app).get("/api/clients");
    expect(res.status).toBe(401);
  });
});
