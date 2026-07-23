import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Client } from "../../models/Client";
import { Service } from "../../models/Service";
import { Sale } from "../../models/Sale";
import { SaleDetail } from "../../models/SaleDetail";
import { Payment } from "../../models/Payment";
import { ServiceStatus } from "../../models/ServiceStatus";
import { PaymentStatus } from "../../models/PaymentStatus";
import { PaymentMethod } from "../../models/PaymentMethod";

// Cubre isLastActiveDetail/voidSaleCascade (saleCascade.helper.ts) en los DOS
// endpoints que pueden cancelar un DetalleVenta: el PATCH dedicado
// (changeSaleDetailStatus) y el PUT genérico (updateSaleDetail, que replica la
// misma cascada). Mismo patrón que cancel-appointment-with-sale.test.ts:
// 409 con pagos validados, cascada exitosa, y que NO cascadee si todavía queda
// otro servicio activo.

let adminToken: string;
let client: Client;
let service: Service;
let sinEmpezar: ServiceStatus, finalizado: ServiceStatus, cancelado: ServiceStatus;
let pendiente: PaymentStatus, validado: PaymentStatus;
let metodo: PaymentMethod;

let cascadeSaleId: number;
let cascadeDetailId: number;
let validatedSaleId: number;
let validatedDetailId: number;

let patchCascadeSaleId: number;
let patchCascadeDetailId: number;
let patchValidatedSaleId: number;
let patchValidatedDetailId: number;

let mixSaleId: number;
let mixActiveDetailId: number;

let multiSaleId: number;
let multiDetailAId: number;
let multiDetailBId: number;

const seedSale = async (
  details: ServiceStatus[],
  payments: PaymentStatus[],
): Promise<{ saleId: number; detailIds: number[] }> => {
  const sale = await AppDataSource.getRepository(Sale).save(
    AppDataSource.getRepository(Sale).create({
      fecha: new Date("2026-02-01"), total: 200000, estado: true, client,
    }),
  );

  const detailRepo = AppDataSource.getRepository(SaleDetail);
  const saved = await detailRepo.save(
    details.map((serviceStatus) =>
      detailRepo.create({ fecha: new Date("2026-02-01"), precio: 100000, estado: true, sale, service, serviceStatus }),
    ),
  );

  const paymentRepo = AppDataSource.getRepository(Payment);
  await paymentRepo.save(
    payments.map((paymentStatus) =>
      paymentRepo.create({ fecha: new Date("2026-02-01"), monto: 100000, sale, paymentMethod: metodo, paymentStatus }),
    ),
  );

  return { saleId: sale.id_venta, detailIds: saved.map((d) => d.id_detalle) };
};

const loadSale = (id_venta: number) =>
  AppDataSource.getRepository(Sale).findOne({
    where: { id_venta },
    relations: ["saleDetails", "saleDetails.serviceStatus", "payments", "payments.paymentStatus"],
  });

beforeAll(async () => {
  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;

  const clientRepo = AppDataSource.getRepository(Client);
  client = await clientRepo.save(
    clientRepo.create({
      tipoDocumento: "CC", documento: "66660002", nombre: "Test SaleDetail Cascade",
      correo: "sdcascade@test.com", telefono: "3007778800", estado: true,
    }),
  );

  service = (await AppDataSource.getRepository(Service).findOne({ where: {} }))!;

  const ssRepo = AppDataSource.getRepository(ServiceStatus);
  sinEmpezar = (await ssRepo.findOneBy({ nombre: "Sin empezar" }))!;
  finalizado = (await ssRepo.findOneBy({ nombre: "Finalizado" }))!;
  cancelado  = (await ssRepo.findOneBy({ nombre: "Cancelado" }))!;

  const psRepo = AppDataSource.getRepository(PaymentStatus);
  pendiente = (await psRepo.findOneBy({ nombre: "Pendiente" }))!;
  validado  = (await psRepo.findOneBy({ nombre: "Validado" }))!;

  metodo = (await AppDataSource.getRepository(PaymentMethod).findOne({ where: {} }))!;

  // Único servicio activo (sinEmpezar) + un abono pendiente: cancelarlo vía PUT
  // debe cascadear y anular la venta.
  const cascade = await seedSale([sinEmpezar], [pendiente]);
  cascadeSaleId = cascade.saleId;
  cascadeDetailId = cascade.detailIds[0];

  // Único servicio activo pero con un pago Validado: cancelarlo vía PUT debe
  // bloquear con 409, igual que el PATCH dedicado.
  const validatedSeed = await seedSale([sinEmpezar], [validado]);
  validatedSaleId = validatedSeed.saleId;
  validatedDetailId = validatedSeed.detailIds[0];

  // Mismos dos escenarios, pero ejercitando el endpoint PATCH dedicado
  // (changeSaleDetailStatus) — nunca se había probado ese camino exitoso.
  const patchCascade = await seedSale([sinEmpezar], [pendiente]);
  patchCascadeSaleId = patchCascade.saleId;
  patchCascadeDetailId = patchCascade.detailIds[0];

  const patchValidated = await seedSale([sinEmpezar], [validado]);
  patchValidatedSaleId = patchValidated.saleId;
  patchValidatedDetailId = patchValidated.detailIds[0];

  // Un servicio ya Finalizado + uno activo: cancelar el activo SÍ debe
  // cascadear (es el último activo), el Finalizado no se toca.
  const mix = await seedSale([finalizado, sinEmpezar], [pendiente]);
  mixSaleId = mix.saleId;
  mixActiveDetailId = mix.detailIds[1];

  // Dos servicios activos: cancelar uno NO debe cascadear (todavía queda el
  // otro activo) — solo cuando se cancele el segundo (el último) cascadea.
  const multi = await seedSale([sinEmpezar, sinEmpezar], [pendiente]);
  multiSaleId = multi.saleId;
  multiDetailAId = multi.detailIds[0];
  multiDetailBId = multi.detailIds[1];
});

describe("PUT /api/sale-details/:id — cascada hacia arriba al cancelar", () => {
  it("returns 409 when it's the last active detail and the sale has a Validado payment, and changes nothing", async () => {
    const res = await request(app)
      .put(`/api/sale-details/${validatedDetailId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado: cancelado.id_estado });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    const sale = await loadSale(validatedSaleId);
    expect(sale!.estado).toBe(true);
    expect(sale!.saleDetails[0].serviceStatus.nombre).toBe("Sin empezar");
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Validado");
  });

  it("cancels the last active detail and cascades: voids the sale and its pending installments", async () => {
    const res = await request(app)
      .put(`/api/sale-details/${cascadeDetailId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado: cancelado.id_estado });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ abonosAnulados: 1 });

    const sale = await loadSale(cascadeSaleId);
    expect(sale!.estado).toBe(false);
    expect(sale!.saleDetails[0].serviceStatus.nombre).toBe("Cancelado");
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Anulado");
  });

  it("a Cancelado detail is terminal — cannot be edited again via PUT", async () => {
    const res = await request(app)
      .put(`/api/sale-details/${cascadeDetailId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ observacion: "intento de editar tras cancelar" });

    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/service-status/detalle/:id_detalle/estado — cascada hacia arriba al cancelar", () => {
  it("returns 409 when it's the last active detail and the sale has a Validado payment, and changes nothing", async () => {
    const res = await request(app)
      .patch(`/api/service-status/detalle/${patchValidatedDetailId}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado: cancelado.id_estado });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    const sale = await loadSale(patchValidatedSaleId);
    expect(sale!.estado).toBe(true);
    expect(sale!.saleDetails[0].serviceStatus.nombre).toBe("Sin empezar");
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Validado");
  });

  it("cancels the last active detail and cascades: voids the sale and its pending installments", async () => {
    const res = await request(app)
      .patch(`/api/service-status/detalle/${patchCascadeDetailId}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado: cancelado.id_estado });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ abonosAnulados: 1 });

    const sale = await loadSale(patchCascadeSaleId);
    expect(sale!.estado).toBe(false);
    expect(sale!.saleDetails[0].serviceStatus.nombre).toBe("Cancelado");
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Anulado");
  });
});

describe("Cascada solo dispara al cancelar el ÚLTIMO servicio activo", () => {
  it("cancelling the active detail cascades even with an untouched Finalizado sibling", async () => {
    const res = await request(app)
      .put(`/api/sale-details/${mixActiveDetailId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado: cancelado.id_estado });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ abonosAnulados: 1 });

    const sale = await loadSale(mixSaleId);
    expect(sale!.estado).toBe(false);
    const nombres = sale!.saleDetails.map((d) => d.serviceStatus.nombre).sort();
    expect(nombres).toEqual(["Cancelado", "Finalizado"]); // el Finalizado no se toca
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Anulado");
  });

  it("cancelling one of two active details does NOT cascade — the sale stays active", async () => {
    const res = await request(app)
      .put(`/api/sale-details/${multiDetailAId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado: cancelado.id_estado });

    expect(res.status).toBe(200);
    expect(res.body.data.abonosAnulados).toBeUndefined();

    const sale = await loadSale(multiSaleId);
    expect(sale!.estado).toBe(true);
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Pendiente");
    const b = sale!.saleDetails.find((d) => d.id_detalle === multiDetailBId)!;
    expect(b.serviceStatus.nombre).toBe("Sin empezar");
  });

  it("cancelling the second (now last) active detail cascades", async () => {
    const res = await request(app)
      .put(`/api/sale-details/${multiDetailBId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado: cancelado.id_estado });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ abonosAnulados: 1 });

    const sale = await loadSale(multiSaleId);
    expect(sale!.estado).toBe(false);
    expect(sale!.saleDetails.every((d) => d.serviceStatus.nombre === "Cancelado")).toBe(true);
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Anulado");
  });
});
