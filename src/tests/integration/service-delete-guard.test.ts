import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Service } from "../../models/Service";
import { SaleDetail } from "../../models/SaleDetail";
import { Client } from "../../models/Client";
import { Sale } from "../../models/Sale";

// deleteService ya usaba enviarNoEliminarAsociados (mensaje crudo anterior:
// "existen DetalleVenta asociados (1)" — nombre técnico, sin concordancia).
// Ningún test lo confirmaba, y el ticket de Roles mostró que este tipo de
// conteo anidado ("where: { relacion: { id } }") puede estar roto según la
// entidad — se verifica acá con datos reales en vez de asumir por lectura.

let adminToken: string;
let client: Client;

beforeAll(async () => {
  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;

  client = await AppDataSource.getRepository(Client).save(
    AppDataSource.getRepository(Client).create({
      tipoDocumento: "CC", documento: "66660099", nombre: "Test Service Guard",
      correo: "serviceguard@test.com", telefono: "3007778811", estado: true,
    }),
  );
});

describe("DELETE /api/services/:id — mensaje de DetalleVenta asociados", () => {
  it("returns 409 with correct singular wording when the service has one associated DetalleVenta", async () => {
    const servicioRepo = AppDataSource.getRepository(Service);
    const servicio = await servicioRepo.save(servicioRepo.create({ nombre: "Servicio Con Un Detalle", duracion: 30, estado: true }));

    const sale = await AppDataSource.getRepository(Sale).save(
      AppDataSource.getRepository(Sale).create({ fecha: new Date("2026-02-01"), total: 50000, estado: true, client }),
    );
    await AppDataSource.getRepository(SaleDetail).save(
      AppDataSource.getRepository(SaleDetail).create({ fecha: new Date("2026-02-01"), precio: 50000, estado: true, sale, service: servicio }),
    );

    const res = await request(app)
      .delete(`/api/services/${servicio.id_servicio}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("No se puede eliminar: existe 1 servicio de venta asociado. Desactívalo en su lugar.");
    expect(res.body.message).not.toContain("DetalleVenta");

    const stillExists = await servicioRepo.findOneBy({ id_servicio: servicio.id_servicio });
    expect(stillExists).not.toBeNull();
  });

  it("returns 409 with correct plural wording when the service has two associated DetalleVenta", async () => {
    const servicioRepo = AppDataSource.getRepository(Service);
    const servicio = await servicioRepo.save(servicioRepo.create({ nombre: "Servicio Con Dos Detalles", duracion: 30, estado: true }));

    const sale = await AppDataSource.getRepository(Sale).save(
      AppDataSource.getRepository(Sale).create({ fecha: new Date("2026-02-01"), total: 100000, estado: true, client }),
    );
    const detalleRepo = AppDataSource.getRepository(SaleDetail);
    await detalleRepo.save([
      detalleRepo.create({ fecha: new Date("2026-02-01"), precio: 50000, estado: true, sale, service: servicio }),
      detalleRepo.create({ fecha: new Date("2026-02-01"), precio: 50000, estado: true, sale, service: servicio }),
    ]);

    const res = await request(app)
      .delete(`/api/services/${servicio.id_servicio}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("No se puede eliminar: existen 2 servicios de venta asociados. Desactívalo en su lugar.");
  });

  it("deletes a service with no associated DetalleVenta", async () => {
    const servicioRepo = AppDataSource.getRepository(Service);
    const servicio = await servicioRepo.save(servicioRepo.create({ nombre: "Servicio Sin Uso", duracion: 30, estado: true }));

    const res = await request(app)
      .delete(`/api/services/${servicio.id_servicio}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
