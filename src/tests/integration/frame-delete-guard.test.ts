import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Frame } from "../../models/Frame";
import { SaleDetail } from "../../models/SaleDetail";
import { Client } from "../../models/Client";
import { Sale } from "../../models/Sale";
import { Service } from "../../models/Service";

// deleteFrame ya usaba enviarNoEliminarAsociados (mensaje crudo anterior:
// "existen DetalleVenta asociados (1)" — nombre técnico, sin concordancia).
// Mismo criterio que service-delete-guard.test.ts: SaleDetail.frame es un
// ManyToOne normal (nullable), sin el problema de clave compuesta que sí
// tenía RolePermission en Roles — se verifica con datos reales.

let adminToken: string;
let client: Client;
let service: Service;

beforeAll(async () => {
  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;

  client = await AppDataSource.getRepository(Client).save(
    AppDataSource.getRepository(Client).create({
      tipoDocumento: "CC", documento: "66660098", nombre: "Test Frame Guard",
      correo: "frameguard@test.com", telefono: "3007778812", estado: true,
    }),
  );

  service = (await AppDataSource.getRepository(Service).findOne({ where: {} }))!;
});

describe("DELETE /api/frames/:id — mensaje de DetalleVenta asociados", () => {
  it("returns 409 with correct singular wording when the frame has one associated DetalleVenta", async () => {
    const marcoRepo = AppDataSource.getRepository(Frame);
    const marco = await marcoRepo.save(marcoRepo.create({ codigo: "MARCO-GUARD-1", colilla: 5, precio_ensamblado: 10000, estado: true }));

    const sale = await AppDataSource.getRepository(Sale).save(
      AppDataSource.getRepository(Sale).create({ fecha: new Date("2026-02-01"), total: 50000, estado: true, client }),
    );
    await AppDataSource.getRepository(SaleDetail).save(
      AppDataSource.getRepository(SaleDetail).create({ fecha: new Date("2026-02-01"), precio: 50000, estado: true, sale, service, frame: marco }),
    );

    const res = await request(app)
      .delete(`/api/frames/${marco.id_marco}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("No se puede eliminar: existe 1 servicio de venta asociado. Desactívalo en su lugar.");
    expect(res.body.message).not.toContain("DetalleVenta");

    const stillExists = await marcoRepo.findOneBy({ id_marco: marco.id_marco });
    expect(stillExists).not.toBeNull();
  });

  it("returns 409 with correct plural wording when the frame has two associated DetalleVenta", async () => {
    const marcoRepo = AppDataSource.getRepository(Frame);
    const marco = await marcoRepo.save(marcoRepo.create({ codigo: "MARCO-GUARD-2", colilla: 5, precio_ensamblado: 10000, estado: true }));

    const sale = await AppDataSource.getRepository(Sale).save(
      AppDataSource.getRepository(Sale).create({ fecha: new Date("2026-02-01"), total: 100000, estado: true, client }),
    );
    const detalleRepo = AppDataSource.getRepository(SaleDetail);
    await detalleRepo.save([
      detalleRepo.create({ fecha: new Date("2026-02-01"), precio: 50000, estado: true, sale, service, frame: marco }),
      detalleRepo.create({ fecha: new Date("2026-02-01"), precio: 50000, estado: true, sale, service, frame: marco }),
    ]);

    const res = await request(app)
      .delete(`/api/frames/${marco.id_marco}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("No se puede eliminar: existen 2 servicios de venta asociados. Desactívalo en su lugar.");
  });

  it("deletes a frame with no associated DetalleVenta", async () => {
    const marcoRepo = AppDataSource.getRepository(Frame);
    const marco = await marcoRepo.save(marcoRepo.create({ codigo: "MARCO-GUARD-SIN-USO", colilla: 5, precio_ensamblado: 10000, estado: true }));

    const res = await request(app)
      .delete(`/api/frames/${marco.id_marco}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
