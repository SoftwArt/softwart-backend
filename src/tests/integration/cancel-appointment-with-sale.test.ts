import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Client } from "../../models/Client";
import { Service } from "../../models/Service";
import { Appointment } from "../../models/Appointment";
import { AppointmentStatus } from "../../models/AppointmentStatus";
import { Sale } from "../../models/Sale";
import { SaleDetail } from "../../models/SaleDetail";
import { Payment } from "../../models/Payment";
import { ServiceStatus } from "../../models/ServiceStatus";
import { PaymentStatus } from "../../models/PaymentStatus";
import { PaymentMethod } from "../../models/PaymentMethod";

// Cancelar una cita que ya tiene Venta debe cascadear la misma anulación que
// toggleSaleStatus: bloquear si hay pagos validados, o si no, cancelar
// servicios no finalizados y anular abonos pendientes — junto con Cita→Cancelada.
// Se prueba en los dos endpoints que pueden cancelar una cita (PATCH estado-cita
// y PUT appointments), porque el guard vive duplicado en ambos controllers.

let adminToken: string;
let client: Client;
let service: Service;
let completada: AppointmentStatus, cancelada: AppointmentStatus;
let sinEmpezar: ServiceStatus, finalizado: ServiceStatus;
let pendiente: PaymentStatus, validado: PaymentStatus;
let metodo: PaymentMethod;

/** Crea Cita(Completada) + Venta + sus detalles y pagos. */
const seedCitaConVenta = async (
  details: ServiceStatus[],
  payments: PaymentStatus[],
): Promise<{ citaId: number; ventaId: number }> => {
  const citaRepo = AppDataSource.getRepository(Appointment);
  const cita = await citaRepo.save(citaRepo.create({
    fecha: new Date("2026-04-01"), hora: "10:00:00", client, appointmentStatus: completada,
  }));

  const sale = await AppDataSource.getRepository(Sale).save(
    AppDataSource.getRepository(Sale).create({
      fecha: new Date("2026-04-01"), total: 200000, estado: true, client, appointment: cita,
    }),
  );

  const detailRepo = AppDataSource.getRepository(SaleDetail);
  await detailRepo.save(
    details.map((serviceStatus) =>
      detailRepo.create({ fecha: new Date("2026-04-01"), precio: 100000, estado: true, sale, service, serviceStatus }),
    ),
  );

  const paymentRepo = AppDataSource.getRepository(Payment);
  await paymentRepo.save(
    payments.map((paymentStatus) =>
      paymentRepo.create({ fecha: new Date("2026-04-01"), monto: 100000, sale, paymentMethod: metodo, paymentStatus }),
    ),
  );

  return { citaId: cita.id_cita, ventaId: sale.id_venta };
};

const loadCita = (id_cita: number) =>
  AppDataSource.getRepository(Appointment).findOne({ where: { id_cita }, relations: ["appointmentStatus"] });

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
      tipoDocumento: "CC", documento: "88880001", nombre: "Test Cancel Cita Con Venta",
      correo: "cancelcitaventa@test.com", telefono: "3007778811", estado: true,
    }),
  );

  service = (await AppDataSource.getRepository(Service).findOne({ where: {} }))!;

  const estadoCitaRepo = AppDataSource.getRepository(AppointmentStatus);
  completada = (await estadoCitaRepo.findOneBy({ nombre: "Completada" }))!;
  cancelada  = (await estadoCitaRepo.findOneBy({ nombre: "Cancelada" }))!;

  const ssRepo = AppDataSource.getRepository(ServiceStatus);
  sinEmpezar = (await ssRepo.findOneBy({ nombre: "Sin empezar" }))!;
  finalizado = (await ssRepo.findOneBy({ nombre: "Finalizado" }))!;

  const psRepo = AppDataSource.getRepository(PaymentStatus);
  pendiente = (await psRepo.findOneBy({ nombre: "Pendiente" }))!;
  validado  = (await psRepo.findOneBy({ nombre: "Validado" }))!;

  metodo = (await AppDataSource.getRepository(PaymentMethod).findOne({ where: {} }))!;
});

describe("PATCH /api/appointment-status/cita/:id_cita/estado — cascada a Venta", () => {
  it("returns 409 when the sale has a Validado payment, and changes nothing", async () => {
    const { citaId, ventaId } = await seedCitaConVenta([sinEmpezar], [validado]);

    const res = await request(app)
      .patch(`/api/appointment-status/cita/${citaId}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado_cita: cancelada.id_estado_cita });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    const cita = await loadCita(citaId);
    expect(cita!.appointmentStatus.nombre).toBe("Completada");

    const sale = await loadSale(ventaId);
    expect(sale!.estado).toBe(true);
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Validado");
  });

  it("cancels the cita and cascades: sale voided, unfinished detail cancelled, pending payment annulled", async () => {
    const { citaId, ventaId } = await seedCitaConVenta([sinEmpezar, finalizado], [pendiente]);

    const res = await request(app)
      .patch(`/api/appointment-status/cita/${citaId}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado_cita: cancelada.id_estado_cita });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ serviciosCancelados: 1, abonosAnulados: 1 });

    const cita = await loadCita(citaId);
    expect(cita!.appointmentStatus.nombre).toBe("Cancelada");

    const sale = await loadSale(ventaId);
    expect(sale!.estado).toBe(false);
    const nombres = sale!.saleDetails.map((d) => d.serviceStatus.nombre).sort();
    expect(nombres).toEqual(["Cancelado", "Finalizado"]); // el Finalizado no se toca
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Anulado");
  });

  it("cancels a cita with no sale directly, without touching anything else", async () => {
    const citaRepo = AppDataSource.getRepository(Appointment);
    const cita = await citaRepo.save(citaRepo.create({
      fecha: new Date("2026-04-05"), hora: "09:00:00", client, appointmentStatus: completada,
    }));

    const res = await request(app)
      .patch(`/api/appointment-status/cita/${cita.id_cita}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado_cita: cancelada.id_estado_cita });

    expect(res.status).toBe(200);
    const reloaded = await loadCita(cita.id_cita);
    expect(reloaded!.appointmentStatus.nombre).toBe("Cancelada");
  });
});

describe("PUT /api/appointments/:id — misma cascada (guard duplicado en el otro controller)", () => {
  it("returns 409 when the sale has a Validado payment, and changes nothing", async () => {
    const { citaId, ventaId } = await seedCitaConVenta([sinEmpezar], [validado]);

    const res = await request(app)
      .put(`/api/appointments/${citaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado_cita: cancelada.id_estado_cita });

    expect(res.status).toBe(409);

    const cita = await loadCita(citaId);
    expect(cita!.appointmentStatus.nombre).toBe("Completada");

    const sale = await loadSale(ventaId);
    expect(sale!.estado).toBe(true);
  });

  it("cancels the cita and cascades the sale, its details and pending payments", async () => {
    const { citaId, ventaId } = await seedCitaConVenta([sinEmpezar], [pendiente]);

    const res = await request(app)
      .put(`/api/appointments/${citaId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado_cita: cancelada.id_estado_cita });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ serviciosCancelados: 1, abonosAnulados: 1 });

    const cita = await loadCita(citaId);
    expect(cita!.appointmentStatus.nombre).toBe("Cancelada");

    const sale = await loadSale(ventaId);
    expect(sale!.estado).toBe(false);
    expect(sale!.saleDetails[0].serviceStatus.nombre).toBe("Cancelado");
    expect(sale!.payments[0].paymentStatus.nombre).toBe("Anulado");
  });
});

describe("Hard-delete retirado del flujo de venta", () => {
  it("DELETE /api/sales/:id no longer exists", async () => {
    const res = await request(app).delete("/api/sales/1").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("DELETE /api/sale-details/:id no longer exists", async () => {
    const res = await request(app).delete("/api/sale-details/1").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("DELETE /api/payments/:id no longer exists", async () => {
    const res = await request(app).delete("/api/payments/1").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
