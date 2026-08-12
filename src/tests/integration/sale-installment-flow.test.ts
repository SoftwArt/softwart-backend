import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Client } from "../../models/Client";
import { Sale } from "../../models/Sale";
import { PaymentMethod } from "../../models/PaymentMethod";

let adminToken: string;
let client: Client;
let paymentMethod: PaymentMethod;
let saleId: number;

beforeAll(async () => {
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ correo: "admin@softwart.com", clave: "Admin1234!" });
  adminToken = loginRes.body.token;

  client = await AppDataSource.getRepository(Client).save(
    AppDataSource.getRepository(Client).create({
      tipoDocumento: "CC",
      documento: "77777777",
      nombre: "Sale Installment Flow",
      correo: "sale-installment-flow@test.com",
      telefono: "3001234500",
      estado: true,
    }),
  );

  paymentMethod = (
    await AppDataSource.getRepository(PaymentMethod).findOne({ where: {} })
  )!;

  const sale = await AppDataSource.getRepository(Sale).save(
    AppDataSource.getRepository(Sale).create({
      fecha: new Date("2026-06-01"),
      total: 100000,
      estado: true,
      client,
      num_abonos: 2,
      porcentaje_primer_abono: 70,
    }),
  );
  saleId = sale.id_venta;
});

describe("Sale installments lifecycle", () => {
  it("updates installment configuration before any payments", async () => {
    const res = await request(app)
      .patch(`/api/sales/${saleId}/configure-installments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ num_abonos: 3, porcentaje_primer_abono: 50 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.num_abonos).toBe(3);
    expect(res.body.data.porcentaje_primer_abono).toBe(50);
    expect(res.body.data.plan_abonos).toHaveLength(3);
    expect(res.body.data.plan_abonos[0].amount).toBe(50000);
    expect(res.body.data.plan_abonos[1].amount).toBe(25000);
    expect(res.body.data.plan_abonos[2].amount).toBe(25000);
  });

  it("returns the expected payment plan data for the sale", async () => {
    const res = await request(app)
      .get(`/api/sales/${saleId}/payment-plan`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.completado).toBe(false);
    expect(res.body.data.pagos_realizados).toBe(0);
    expect(res.body.data.total_pagado).toBe(0);
    expect(res.body.data.saldo_pendiente).toBe(100000);
    expect(res.body.data.siguiente_abono.expectedAmount).toBe(50000);
  });

  it("rejects a too-small first installment and preserves the sale state", async () => {
    const res = await request(app)
      .post(`/api/sales/${saleId}/installment`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ monto: 30000, id_metodo_pago: paymentMethod.id_metodo_pago });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("El abono #1 debe ser de al menos");
  });

  it("registers the first installment and updates the remaining balance", async () => {
    const res = await request(app)
      .post(`/api/sales/${saleId}/installment`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ monto: 50000, id_metodo_pago: paymentMethod.id_metodo_pago });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.abono_numero).toBe(1);
    expect(res.body.data.total_pagado).toBe(50000);
    expect(res.body.data.saldo_pendiente).toBe(50000);
    expect(res.body.data.completado).toBe(false);
  });

  it("rejects a too-small second installment and preserves the sale state", async () => {
    const res = await request(app)
      .post(`/api/sales/${saleId}/installment`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ monto: 24000, id_metodo_pago: paymentMethod.id_metodo_pago });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("El abono #2 debe ser de al menos");
  });

  it("registers the second installment and preserves unfinished status", async () => {
    const res = await request(app)
      .post(`/api/sales/${saleId}/installment`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ monto: 25000, id_metodo_pago: paymentMethod.id_metodo_pago });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.abono_numero).toBe(2);
    expect(res.body.data.total_pagado).toBe(75000);
    expect(res.body.data.saldo_pendiente).toBe(25000);
    expect(res.body.data.completado).toBe(false);
  });

  it("registers the third installment and completes the sale payment plan", async () => {
    const res = await request(app)
      .post(`/api/sales/${saleId}/installment`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ monto: 25000, id_metodo_pago: paymentMethod.id_metodo_pago });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.abono_numero).toBe(3);
    expect(res.body.data.completado).toBe(true);
    expect(res.body.data.saldo_pendiente).toBe(0);
    expect(res.body.data.total_pagado).toBe(100000);
  });

  it("returns a completed payment plan after all installments", async () => {
    const res = await request(app)
      .get(`/api/sales/${saleId}/payment-plan`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.completado).toBe(true);
    expect(res.body.data.total_pagado).toBe(100000);
    expect(res.body.data.saldo_pendiente).toBe(0);
  });
});
