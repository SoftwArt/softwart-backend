import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Role } from "../../models/Role";
import { Permission } from "../../models/Permission";
import { RolePermission } from "../../models/RolePermission";
import { User } from "../../models/User";

// Admin y Cliente son roles estructurales (esRolEstructural en RoleController):
// no se pueden renombrar, eliminar ni desactivar — porque deleteRole/
// toggleRoleStatus/updateRole los identifican por NOMBRE (comparación de
// texto, no un id fijo). Renombrar "Admin" a cualquier otra cosa los dejaría
// irreconocibles para esos guards y perdería toda la protección. Ninguno de
// los tres guards tenía cobertura de test hasta ahora.

let adminToken: string;
let adminRoleId: number;
let clienteRoleId: number;
let customRoleId: number;

beforeAll(async () => {
  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;

  const rolRepo = AppDataSource.getRepository(Role);
  adminRoleId   = (await rolRepo.findOneBy({ nombre: "Admin" }))!.id_rol;
  clienteRoleId = (await rolRepo.findOneBy({ nombre: "Cliente" }))!.id_rol;

  const custom = await rolRepo.save(rolRepo.create({ nombre: "Rol De Prueba", estado: true }));
  customRoleId = custom.id_rol;
});

describe("PUT /api/roles/:id — no se puede renombrar un rol estructural", () => {
  it("returns 403 when trying to rename Admin, and changes nothing", async () => {
    const res = await request(app)
      .put(`/api/roles/${adminRoleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "SuperAdmin" });

    expect(res.status).toBe(403);

    const rol = await AppDataSource.getRepository(Role).findOneBy({ id_rol: adminRoleId });
    expect(rol!.nombre).toBe("Admin");
  });

  it("returns 403 when trying to rename Cliente", async () => {
    const res = await request(app)
      .put(`/api/roles/${clienteRoleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Comprador" });

    expect(res.status).toBe(403);
  });

  it("allows sending Admin's own unchanged nombre (comparación case-insensitive)", async () => {
    const res = await request(app)
      .put(`/api/roles/${adminRoleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "admin" });

    expect(res.status).toBe(200);
  });

  it("still allows editing Admin's descripcion", async () => {
    const res = await request(app)
      .put(`/api/roles/${adminRoleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ descripcion: "Rol con acceso total al sistema" });

    expect(res.status).toBe(200);
    expect(res.body.data.descripcion).toBe("Rol con acceso total al sistema");
  });

  it("a non-structural role can still be renamed", async () => {
    const res = await request(app)
      .put(`/api/roles/${customRoleId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ nombre: "Rol Renombrado" });

    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/roles/:id y PATCH /:id/estado — protección estructural", () => {
  it("returns 403 deleting Admin", async () => {
    const res = await request(app).delete(`/api/roles/${adminRoleId}`).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 403 deleting Cliente", async () => {
    const res = await request(app).delete(`/api/roles/${clienteRoleId}`).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 403 deactivating Admin, and its estado does not change", async () => {
    const res = await request(app).patch(`/api/roles/${adminRoleId}/estado`).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(403);

    const rol = await AppDataSource.getRepository(Role).findOneBy({ id_rol: adminRoleId });
    expect(rol!.estado).toBe(true);
  });

  it("returns 403 deactivating Cliente", async () => {
    const res = await request(app).patch(`/api/roles/${clienteRoleId}/estado`).set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/roles/:id — mensaje de asociados (permiso/usuario) con concordancia correcta", () => {
  // El mensaje crudo anterior era literal: `existen PermisoRol asociados (1)`
  // — nombre técnico de la entidad, sin concordar singular/plural. Se
  // reemplazó por enviarNoEliminarAsociados (deleteGuard.helper.ts), que
  // nunca tuvo un test que confirmara el texto real que llega al toast.

  it("returns 409 with correct singular wording when the role has one assigned permission", async () => {
    const rolRepo = AppDataSource.getRepository(Role);
    const rolConPermiso = await rolRepo.save(rolRepo.create({ nombre: "Rol Con Un Permiso", estado: true }));
    const permiso = (await AppDataSource.getRepository(Permission).findOne({ where: {} }))!;
    const rp = new RolePermission();
    rp.role = rolConPermiso;
    rp.permission = permiso;
    await AppDataSource.getRepository(RolePermission).save(rp);

    const res = await request(app)
      .delete(`/api/roles/${rolConPermiso.id_rol}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("No se puede eliminar: existe 1 permiso asociado. Desactívalo en su lugar.");
    expect(res.body.message).not.toContain("PermisoRol");

    const rol = await rolRepo.findOneBy({ id_rol: rolConPermiso.id_rol });
    expect(rol).not.toBeNull(); // no se borró
  });

  it("returns 409 with correct plural wording when the role has two assigned permissions", async () => {
    const rolRepo = AppDataSource.getRepository(Role);
    const rolConPermisos = await rolRepo.save(rolRepo.create({ nombre: "Rol Con Dos Permisos", estado: true }));
    const permisos = await AppDataSource.getRepository(Permission).find({ take: 2 });
    await AppDataSource.getRepository(RolePermission).save(
      permisos.map((permission) => {
        const rp = new RolePermission();
        rp.role = rolConPermisos;
        rp.permission = permission;
        return rp;
      }),
    );

    const res = await request(app)
      .delete(`/api/roles/${rolConPermisos.id_rol}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("No se puede eliminar: existen 2 permisos asociados. Desactívalo en su lugar.");
  });

  it("returns 409 with correct wording when the role has an assigned user (checked after the permission guard)", async () => {
    const rolRepo = AppDataSource.getRepository(Role);
    const rolConUsuario = await rolRepo.save(rolRepo.create({ nombre: "Rol Con Un Usuario", estado: true }));
    await AppDataSource.getRepository(User).save(
      AppDataSource.getRepository(User).create({
        correo: "usuario-rol-guard@test.com", clave: "hash-no-importa", estado: true, role: rolConUsuario,
      }),
    );

    const res = await request(app)
      .delete(`/api/roles/${rolConUsuario.id_rol}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("No se puede eliminar: existe 1 usuario asociado. Desactívalo en su lugar.");
    expect(res.body.message).not.toContain("Usuario asociados");
  });
});
