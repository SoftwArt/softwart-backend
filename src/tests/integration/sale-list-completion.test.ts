import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Client } from "../../models/Client";
import { Sale } from "../../models/Sale";
import { Payment } from "../../models/Payment";
import { PaymentStatus } from "../../models/PaymentStatus";
import { PaymentMethod } from "../../models/PaymentMethod";

let adminToken: string;
let client: Client;
let paymentMethod: PaymentMethod;
let pendienteStatus: PaymentStatus;
let validadoStatus: PaymentStatus;
let saleIncompleteId: number;
let saleCompleteId: number;

beforeAll(async () => {
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ correo: "admin@softwart.com", clave: "Admin1234!" });
  adminToken = loginRes.body.token;

  const clientRepo = AppDataSource.getRepository(Client);
  client = await clientRepo.save(
    clientRepo.create({
      tipoDocumento: "CC",
      documento: "77777777",
      nombre: "Sale List Completion",
      correo: "sale-list-completion@test.com",
      telefono: "3001234567",
      estado: true,
    }),
  );

  const paymentMethodRepo = AppDataSource.getRepository(PaymentMethod);
  paymentMethod = (await paymentMethodRepo.findOne({ where: {} }))!;

  const paymentStatusRepo = AppDataSource.getRepository(PaymentStatus);
  pendienteStatus = (await paymentStatusRepo.findOneBy({ nombre: "Pendiente" }))!;
  validadoStatus = (await paymentStatusRepo.findOneBy({ nombre: "Validado" }))!;

  const saleRepo = AppDataSource.getRepository(Sale);
  const incompleteSale = await saleRepo.save(
    saleRepo.create({
      fecha: new Date("2026-01-01"),
      total: 100000,
      estado: true,
      client,
      num_abonos: 2,
      porcentaje_primer_abono: 70,
    }),
  );

  const completeSale = await saleRepo.save(
    saleRepo.create({
      fecha: new Date("2026-01-02"),
      total: 100000,
      estado: true,
      client,
      num_abonos: 2,
      porcentaje_primer_abono: 70,
    }),
  );

  saleIncompleteId = incompleteSale.id_venta;
  saleCompleteId = completeSale.id_venta;

  const paymentRepo = AppDataSource.getRepository(Payment);
  await paymentRepo.save(
    paymentRepo.create({
      fecha: new Date("2026-01-03"),
      monto: 100000,
      sale: completeSale,
      paymentMethod,
      paymentStatus: validadoStatus,
    }),
  );
});

describe("GET /api/sales", () => {
  it("returns completado false for sales without full payment and true for completed sales", async () => {
    const res = await request(app)
      .get("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ limit: 50 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data as Array<Record<string, unknown>>;
    const incomplete = data.find((item) => item.id_venta === saleIncompleteId);
    const complete = data.find((item) => item.id_venta === saleCompleteId);

    expect(incomplete).toBeDefined();
    expect(complete).toBeDefined();
    expect(incomplete?.completado).toBe(false);
    expect(complete?.completado).toBe(true);
  });
});
