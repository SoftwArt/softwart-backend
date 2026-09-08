import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Client } from "../../models/Client";
import { Sale } from "../../models/Sale";

// Cubre la vía alterna de configuración de abonos: en vez de indicar el
// porcentaje del primer abono, el cliente da su valor en pesos y el backend
// lo convierte (Sale.porcentaje_primer_abono sigue siendo la única columna
// persistida — ver SaleInstallmentsController.configureInstallments).

let adminToken: string;
let client: Client;

const crearVenta = async (total: number): Promise<number> => {
  const sale = await AppDataSource.getRepository(Sale).save(
    AppDataSource.getRepository(Sale).create({
      fecha: new Date("2026-06-01"),
      total,
      estado: true,
      client,
      num_abonos: 2,
      porcentaje_primer_abono: 70,
    }),
  );
  return sale.id_venta;
};

beforeAll(async () => {
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ correo: "admin@softwart.com", clave: "Admin1234!" });
  adminToken = loginRes.body.token;

  client = await AppDataSource.getRepository(Client).save(
    AppDataSource.getRepository(Client).create({
      tipoDocumento: "CC",
      documento: "77777778",
      nombre: "Configure Installments By Amount",
      correo: "configure-by-amount@test.com",
      telefono: "3001234501",
      estado: true,
    }),
  );
});

describe("PATCH /api/sales/:id/configure-installments — monto_primer_abono", () => {
  it("converts a first-installment amount into the equivalent percentage", async () => {
    const id_venta = await crearVenta(100000);

    const res = await request(app)
      .patch(`/api/sales/${id_venta}/configure-installments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ monto_primer_abono: 60000 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.porcentaje_primer_abono).toBe(60);
    expect(res.body.data.plan_abonos[0].amount).toBe(60000);
    expect(res.body.data.plan_abonos[1].amount).toBe(40000);
  });

  it("rounds to the nearest percentage point when the amount isn't an exact percentage", async () => {
    const id_venta = await crearVenta(90000);

    const res = await request(app)
      .patch(`/api/sales/${id_venta}/configure-installments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ monto_primer_abono: 30500 }); // 33.9% -> redondea a 34%

    expect(res.status).toBe(200);
    expect(res.body.data.porcentaje_primer_abono).toBe(34);
  });

  it("rejects an amount that rounds to less than 1% of the total", async () => {
    const id_venta = await crearVenta(100000);

    const res = await request(app)
      .patch(`/api/sales/${id_venta}/configure-installments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ monto_primer_abono: 200 }); // 0.2% -> redondea a 0%

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("fuera del rango permitido");
  });

  it("rejects an amount greater than or equal to the sale total", async () => {
    const id_venta = await crearVenta(100000);

    const res = await request(app)
      .patch(`/api/sales/${id_venta}/configure-installments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ monto_primer_abono: 100000 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects sending both porcentaje_primer_abono and monto_primer_abono at once", async () => {
    const id_venta = await crearVenta(100000);

    const res = await request(app)
      .patch(`/api/sales/${id_venta}/configure-installments`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ porcentaje_primer_abono: 50, monto_primer_abono: 50000 });

    // Rechazado por el schema Zod (validate.middleware devuelve 422), antes
    // de llegar al controller.
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});
