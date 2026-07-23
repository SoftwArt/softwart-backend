import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { User } from "../../models/User";
import { Role } from "../../models/Role";

// deleteUser/toggleUserStatus ya protegen al admin base (SEED_ADMIN_ID) —
// updateUser no replicaba esa protección: se podía cambiar su correo o su rol
// vía PUT /api/users/:id, lo que equivale a un bloqueo de acceso encubierto
// (deja de poder loguearse, o pierde los permisos de Admin).

let adminToken: string;
let adminBaseId: number;
let otroRolId: number;

beforeAll(async () => {
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ correo: "admin@softwart.com", clave: "Admin1234!" });
  adminToken = loginRes.body.token;
  adminBaseId = loginRes.body.data.id_usuario;

  const clienteRol = (await AppDataSource.getRepository(Role).findOneBy({ nombre: "Cliente" }))!;
  otroRolId = clienteRol.id_rol;
});

describe("PUT /api/users/:id — protección del admin base", () => {
  it("returns 403 when trying to change the admin base's correo, and changes nothing", async () => {
    const res = await request(app)
      .put(`/api/users/${adminBaseId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ correo: "hijack@test.com" });

    expect(res.status).toBe(403);

    const admin = await AppDataSource.getRepository(User).findOneBy({ id_usuario: adminBaseId });
    expect(admin!.correo).toBe("admin@softwart.com");
  });

  it("returns 403 when trying to change the admin base's role, and changes nothing", async () => {
    const res = await request(app)
      .put(`/api/users/${adminBaseId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_rol: otroRolId });

    expect(res.status).toBe(403);

    const admin = await AppDataSource.getRepository(User).findOne({
      where: { id_usuario: adminBaseId },
      relations: ["role"],
    });
    expect(admin!.role.nombre).toBe("Admin");
  });

  it("allows sending the admin base's own unchanged correo/role", async () => {
    const res = await request(app)
      .put(`/api/users/${adminBaseId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ correo: "admin@softwart.com" });

    expect(res.status).toBe(200);
  });

  it("still allows rotating the admin base's password", async () => {
    const res = await request(app)
      .put(`/api/users/${adminBaseId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ clave: "OtraClaveSegura123!" });

    expect(res.status).toBe(200);

    // Confirma que la nueva clave funciona para loguearse.
    const login = await request(app)
      .post("/api/auth/login")
      .send({ correo: "admin@softwart.com", clave: "OtraClaveSegura123!" });
    expect(login.status).toBe(200);
  });

  it("does not affect a non-admin-base user — correo/role can still change", async () => {
    const usuarioRepo = AppDataSource.getRepository(User);
    const created = await usuarioRepo.save(
      usuarioRepo.create({ correo: "no-admin-base@test.com", clave: "hash-no-importa", estado: true }),
    );

    const res = await request(app)
      .put(`/api/users/${created.id_usuario}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ correo: "cambiado@test.com", id_rol: otroRolId });

    expect(res.status).toBe(200);
  });
});
