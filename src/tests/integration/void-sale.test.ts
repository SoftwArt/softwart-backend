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

// Anular una venta corre una transacción en cascada:
//   · 409 si hay algún pago Validado (dinero recibido → toca devolución, no anulación)
//   · si no: DetalleVenta no finalizados → Cancelado, y abonos Pendiente → Anulado
// Reactivar es un toggle simple, sin cascada inversa.

let adminToken: string;
let client: Client;
let service: Service;
let sinEmpezar: ServiceStatus, finalizado: ServiceStatus;
let pendiente: PaymentStatus, validado: PaymentStatus;
let metodo: PaymentMethod;

let cascadeSaleId: number;   // se anula en cascada, luego se reactiva
let validatedSaleId: number; // tiene un pago Validado → 409

/** Crea una venta activa con sus detalles y pagos. */
const seedSale = async (
  details: ServiceStatus[],
  payments: PaymentStatus[],
): Promise<number> => {
  const sale = await AppDataSource.getRepository(Sale).save(
    AppDataSource.getRepository(Sale).create({
      fecha: new Date("2026-02-01"), total: 200000, estado: true, client,
    }),
  );

  const detailRepo = AppDataSource.getRepository(SaleDetail);
  await detailRepo.save(
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

  return sale.id_venta;
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
      tipoDocumento: "CC", documento: "66660001", nombre: "Test Void Sale",
      correo: "voidsale@test.com", telefono: "3007778899", estado: true,
    }),
  );

  service = (await AppDataSource.getRepository(Service).findOne({ where: {} }))!;

  const ssRepo = AppDataSource.getRepository(ServiceStatus);
  sinEmpezar = (await ssRepo.findOneBy({ nombre: "Sin empezar" }))!;
  finalizado = (await ssRepo.findOneBy({ nombre: "Finalizado" }))!;

  const psRepo = AppDataSource.getRepository(PaymentStatus);
  pendiente = (await psRepo.findOneBy({ nombre: "Pendiente" }))!;
  validado = (await psRepo.findOneBy({ nombre: "Validado" }))!;

  metodo = (await AppDataSource.getRepository(PaymentMethod).findOne({ where: {} }))!;

  // Un servicio en curso + uno ya finalizado, y un abono pendiente.
  cascadeSaleId = await seedSale([sinEmpezar, finalizado], [pendiente]);
  // Un pago validado bloquea la anulación.
  validatedSaleId = await seedSale([sinEmpezar], [validado]);
});

describe("PATCH /api/sales/:id/estado", () => {
  it("returns 409 when the sale has a Validado payment, and changes nothing", async () => {
    const res = await request(app)
      .patch(`/api/sales/${validatedSaleId}/estado`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    const sale = await loadSale(validatedSaleId);
    expect(sale!.estado).toBe(true);
    expect(sale!.saleDetails[0].serviceStatus.nombre).toBe("Sin empezar");
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Validado");
  });

  it("voids the sale and cascades to unfinished details and pending installments", async () => {
    const res = await request(app)
      .patch(`/api/sales/${cascadeSaleId}/estado`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ estado: false, serviciosCancelados: 1, abonosAnulados: 1 });

    const sale = await loadSale(cascadeSaleId);
    expect(sale!.estado).toBe(false);

    const nombres = sale!.saleDetails.map((d) => d.serviceStatus.nombre).sort();
    expect(nombres).toEqual(["Cancelado", "Finalizado"]); // el Finalizado no se toca
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Anulado");
  });

  it("reactivating is a plain toggle — it does not undo the cascade", async () => {
    const res = await request(app)
      .patch(`/api/sales/${cascadeSaleId}/estado`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe(true);

    const sale = await loadSale(cascadeSaleId);
    expect(sale!.estado).toBe(true);
    expect(sale!.saleDetails.map((d) => d.serviceStatus.nombre).sort()).toEqual(["Cancelado", "Finalizado"]);
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Anulado");
  });

  it("returns 404 for a non-existent sale", async () => {
    const res = await request(app)
      .patch("/api/sales/99999/estado")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).patch(`/api/sales/${cascadeSaleId}/estado`);
    expect(res.status).toBe(401);
  });
});
