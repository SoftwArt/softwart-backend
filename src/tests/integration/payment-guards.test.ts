import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Client } from "../../models/Client";
import { Sale } from "../../models/Sale";
import { Payment } from "../../models/Payment";
import { PaymentStatus } from "../../models/PaymentStatus";
import { PaymentMethod } from "../../models/PaymentMethod";

// Cubre los guards de negocio agregados a Pago este sprint, ninguno con
// prueba hasta ahora: id_venta obligatorio, límite de num_abonos, venta
// anulada, y los guards de estado terminal/transición única (ya existían
// para Cita/Servicio con prueba — a Pago le faltaba la suya).

let adminToken: string;
let client: Client;
let metodo: PaymentMethod;
let pendiente: PaymentStatus, validado: PaymentStatus, anulado: PaymentStatus;

const nuevaVenta = async (opts: { estado?: boolean; num_abonos?: number } = {}) =>
  AppDataSource.getRepository(Sale).save(
    AppDataSource.getRepository(Sale).create({
      fecha: new Date("2026-05-01"), total: 200000, estado: opts.estado ?? true,
      num_abonos: opts.num_abonos ?? 2, client,
    }),
  );

const nuevoPago = async (sale: Sale, paymentStatus: PaymentStatus) =>
  AppDataSource.getRepository(Payment).save(
    AppDataSource.getRepository(Payment).create({
      fecha: new Date("2026-05-01"), monto: 100000, sale, paymentMethod: metodo, paymentStatus,
    }),
  );

beforeAll(async () => {
  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;

  client = await AppDataSource.getRepository(Client).save(
    AppDataSource.getRepository(Client).create({
      tipoDocumento: "CC", documento: "88880002", nombre: "Test Payment Guards",
      correo: "paymentguards@test.com", telefono: "3007778822", estado: true,
    }),
  );

  const psRepo = AppDataSource.getRepository(PaymentStatus);
  pendiente = (await psRepo.findOneBy({ nombre: "Pendiente" }))!;
  validado  = (await psRepo.findOneBy({ nombre: "Validado" }))!;
  anulado   = (await psRepo.findOneBy({ nombre: "Anulado" }))!;

  metodo = (await AppDataSource.getRepository(PaymentMethod).findOne({ where: {} }))!;
}, 30000);

describe("POST /api/payments — id_venta obligatorio", () => {
  it("422 sin id_venta (validación Zod)", async () => {
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2026-05-01", monto: 50000, id_metodo_pago: metodo.id_metodo_pago });
    expect(res.status).toBe(422);
  });
});

describe("POST /api/payments — límite de num_abonos", () => {
  it("409 cuando ya se alcanzaron los abonos configurados", async () => {
    const venta = await nuevaVenta({ num_abonos: 1 });
    await nuevoPago(venta, pendiente); // ya cubre el único abono configurado

    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2026-05-01", monto: 50000, id_venta: venta.id_venta, id_metodo_pago: metodo.id_metodo_pago });

    expect(res.status).toBe(409);
  });

  it("los pagos Anulados no cuentan para el límite", async () => {
    const venta = await nuevaVenta({ num_abonos: 1 });
    await nuevoPago(venta, anulado); // no debería contar

    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2026-05-01", monto: 50000, id_venta: venta.id_venta, id_metodo_pago: metodo.id_metodo_pago });

    expect(res.status).toBe(201);
  });
});

describe("POST /api/payments y POST /api/sales/:id/installment — venta anulada", () => {
  it("createPayment: 409 si la venta está anulada (estado=false)", async () => {
    const venta = await nuevaVenta({ estado: false });

    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2026-05-01", monto: 50000, id_venta: venta.id_venta, id_metodo_pago: metodo.id_metodo_pago });

    expect(res.status).toBe(409);
  });

  it("registerInstallment: 409 si la venta está anulada (estado=false)", async () => {
    const venta = await nuevaVenta({ estado: false });

    const res = await request(app)
      .post(`/api/sales/${venta.id_venta}/installment`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ monto: 100000, id_metodo_pago: metodo.id_metodo_pago });

    expect(res.status).toBe(409);
  });
});

describe("PUT /api/payments/:id — estado terminal Anulado", () => {
  it("409 al intentar editar un pago ya Anulado, y no cambia nada", async () => {
    const venta = await nuevaVenta();
    const pago = await nuevoPago(venta, anulado);

    const res = await request(app)
      .put(`/api/payments/${pago.id_pago}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ monto: 999999 });

    expect(res.status).toBe(409);

    const reloaded = await AppDataSource.getRepository(Payment).findOneBy({ id_pago: pago.id_pago });
    expect(Number(reloaded!.monto)).toBe(100000);
  });
});

describe("PATCH /api/payment-status/pago/:id_pago/estado — transición única desde Validado", () => {
  it("409 si un pago Validado intenta ir a un estado que no sea Anulado", async () => {
    const venta = await nuevaVenta();
    const pago = await nuevoPago(venta, validado);

    const res = await request(app)
      .patch(`/api/payment-status/pago/${pago.id_pago}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado_pago: pendiente.id_estado_pago });

    expect(res.status).toBe(409);
  });

  it("200 si un pago Validado se anula", async () => {
    const venta = await nuevaVenta();
    const pago = await nuevoPago(venta, validado);

    const res = await request(app)
      .patch(`/api/payment-status/pago/${pago.id_pago}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado_pago: anulado.id_estado_pago });

    expect(res.status).toBe(200);
  });

  it("409 si se intenta cambiar el estado de un pago ya Anulado", async () => {
    const venta = await nuevaVenta();
    const pago = await nuevoPago(venta, anulado);

    const res = await request(app)
      .patch(`/api/payment-status/pago/${pago.id_pago}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado_pago: pendiente.id_estado_pago });

    expect(res.status).toBe(409);
  });
});
