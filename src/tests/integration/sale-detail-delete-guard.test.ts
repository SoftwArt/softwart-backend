import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Service } from "../../models/Service";
import { SaleDetail } from "../../models/SaleDetail";
import { ServiceStatus } from "../../models/ServiceStatus";
import { Client } from "../../models/Client";
import { Sale } from "../../models/Sale";

// DELETE /api/sale-details/:id (deleteSaleDetail) — hard-delete pensado para
// corregir un error de captura ANTES de que el servicio avance en el flujo
// real: bloqueado si ya está Cancelado o Finalizado (ahí ya es trazabilidad
// de algo que ocurrió o se decidió formalmente, el camino es cancelar/anular,
// no borrar). Fue retirado en d28b7b5 ("nunca tuvo un botón conectado en el
// frontend") y se reintroduce ahora con el guard explícito.

let adminToken: string;
let client: Client;
let servicio: Service;
let sale: Sale;
let estadoSinEmpezar: ServiceStatus;
let estadoCancelado: ServiceStatus;
let estadoFinalizado: ServiceStatus;

beforeAll(async () => {
  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;

  client = await AppDataSource.getRepository(Client).save(
    AppDataSource.getRepository(Client).create({
      tipoDocumento: "CC", documento: "66660199", nombre: "Test SaleDetail Delete Guard",
      correo: "saledetaildeleteguard@test.com", telefono: "3007778822", estado: true,
    }),
  );
  servicio = await AppDataSource.getRepository(Service).save(
    AppDataSource.getRepository(Service).create({ nombre: "Servicio Delete Guard", duracion: 30, estado: true }),
  );
  sale = await AppDataSource.getRepository(Sale).save(
    AppDataSource.getRepository(Sale).create({ fecha: new Date("2026-02-01"), total: 150000, estado: true, client }),
  );

  const statusRepo = AppDataSource.getRepository(ServiceStatus);
  estadoSinEmpezar = (await statusRepo.findOneBy({ nombre: "Sin empezar" }))!;
  estadoCancelado  = (await statusRepo.findOneBy({ nombre: "Cancelado" }))!;
  estadoFinalizado = (await statusRepo.findOneBy({ nombre: "Finalizado" }))!;
});

const crearDetalle = async (serviceStatus: ServiceStatus) =>
  AppDataSource.getRepository(SaleDetail).save(
    AppDataSource.getRepository(SaleDetail).create({
      fecha: new Date("2026-02-01"), precio: 50000, estado: true, sale, service: servicio, serviceStatus,
    }),
  );

describe("DELETE /api/sale-details/:id — guard de estado", () => {
  it("elimina un DetalleVenta 'Sin empezar' (error de captura, aun no avanzo)", async () => {
    const detalle = await crearDetalle(estadoSinEmpezar);

    const res = await request(app)
      .delete(`/api/sale-details/${detalle.id_detalle}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const stillExists = await AppDataSource.getRepository(SaleDetail).findOneBy({ id_detalle: detalle.id_detalle });
    expect(stillExists).toBeNull();
  });

  it("409 al intentar eliminar un DetalleVenta Cancelado — no lo borra", async () => {
    const detalle = await crearDetalle(estadoCancelado);

    const res = await request(app)
      .delete(`/api/sale-details/${detalle.id_detalle}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("Cancelado");
    const stillExists = await AppDataSource.getRepository(SaleDetail).findOneBy({ id_detalle: detalle.id_detalle });
    expect(stillExists).not.toBeNull();
  });

  it("409 al intentar eliminar un DetalleVenta Finalizado — no lo borra", async () => {
    const detalle = await crearDetalle(estadoFinalizado);

    const res = await request(app)
      .delete(`/api/sale-details/${detalle.id_detalle}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("Finalizado");
    const stillExists = await AppDataSource.getRepository(SaleDetail).findOneBy({ id_detalle: detalle.id_detalle });
    expect(stillExists).not.toBeNull();
  });

  it("404 cuando el DetalleVenta no existe", async () => {
    const res = await request(app)
      .delete(`/api/sale-details/999999`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/sale-details/:id — Finalizado no se puede editar (solo cancelar)", () => {
  it("409 al intentar cambiar el precio de un DetalleVenta Finalizado — no lo modifica", async () => {
    const detalle = await crearDetalle(estadoFinalizado);

    const res = await request(app)
      .put(`/api/sale-details/${detalle.id_detalle}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ precio: 99999 });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("Finalizado");
    const reloaded = await AppDataSource.getRepository(SaleDetail).findOneBy({ id_detalle: detalle.id_detalle });
    expect(Number(reloaded!.precio)).toBe(50000);
  });

  it("permite cambiar el estado de Finalizado a Cancelado (unico cambio valido)", async () => {
    // Un hermano activo evita que esta cancelación cascadee sobre la Venta —
    // no es lo que se está probando acá.
    await crearDetalle(estadoSinEmpezar);
    const detalle = await crearDetalle(estadoFinalizado);

    const res = await request(app)
      .put(`/api/sale-details/${detalle.id_detalle}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado: estadoCancelado.id_estado });

    expect(res.status).toBe(200);
    const reloaded = await AppDataSource.getRepository(SaleDetail).findOne({
      where: { id_detalle: detalle.id_detalle }, relations: ["serviceStatus"],
    });
    expect(reloaded!.serviceStatus.nombre).toBe("Cancelado");
  });
});
