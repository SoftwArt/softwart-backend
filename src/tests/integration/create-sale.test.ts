import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Client } from "../../models/Client";
import { Appointment } from "../../models/Appointment";
import { AppointmentStatus } from "../../models/AppointmentStatus";
import { Service } from "../../models/Service";
import { Sale } from "../../models/Sale";
import { Payment } from "../../models/Payment";
import { PaymentMethod } from "../../models/PaymentMethod";

let adminToken: string;
let appointmentId: number;        // Completada — caso exitoso
let dupAppointmentId: number;     // Completada — casos 401 / 422
let pendingAppointmentId: number; // Pendiente  — guard 409
let planAbonosAppointmentId: number;      // Completada — plan_abonos con porcentaje
let planAbonosMontoAppointmentId: number; // Completada — plan_abonos con monto
let planAbonosGuardAppointmentId: number; // Completada — casos 422 / 404 de plan_abonos (nunca llega a crear venta)
let pagoUnicoAppointmentId: number;       // Completada — plan_abonos con num_abonos=1 (100%)
let serviceId: number;
let metodoPagoId: number;

beforeAll(async () => {
  // Login as admin
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ correo: "admin@softwart.com", clave: "Admin1234!" });
  adminToken = loginRes.body.token;

  // Create test client
  const clientRepo = AppDataSource.getRepository(Client);
  const client = await clientRepo.save(
    clientRepo.create({
      tipoDocumento: "CC",
      documento: "88888888",
      nombre: "Test Create Sale",
      correo: "createsale@test.com",
      telefono: "3009999999",
      estado: true,
    })
  );

  // Regla de negocio: solo se factura una cita que ya ocurrió (Completada, id=2).
  // Una cita Pendiente (id=1) debe rechazarse con 409.
  const statusRepo = AppDataSource.getRepository(AppointmentStatus);
  const completada = await statusRepo.findOneBy({ id_estado_cita: 2 });
  const pendiente = await statusRepo.findOneBy({ id_estado_cita: 1 });

  const apptRepo = AppDataSource.getRepository(Appointment);
  const [appt1, appt2, appt3, appt4, appt5, appt6, appt7] = await apptRepo.save([
    apptRepo.create({ fecha: new Date("2025-12-10"), hora: "14:00:00", client, appointmentStatus: completada! }),
    apptRepo.create({ fecha: new Date("2025-12-11"), hora: "15:00:00", client, appointmentStatus: completada! }),
    apptRepo.create({ fecha: new Date("2025-12-12"), hora: "16:00:00", client, appointmentStatus: pendiente! }),
    apptRepo.create({ fecha: new Date("2025-12-13"), hora: "13:00:00", client, appointmentStatus: completada! }),
    apptRepo.create({ fecha: new Date("2025-12-14"), hora: "14:00:00", client, appointmentStatus: completada! }),
    apptRepo.create({ fecha: new Date("2025-12-15"), hora: "15:00:00", client, appointmentStatus: completada! }),
    apptRepo.create({ fecha: new Date("2025-12-16"), hora: "16:00:00", client, appointmentStatus: completada! }),
  ]);
  appointmentId = appt1.id_cita;
  dupAppointmentId = appt2.id_cita;
  pendingAppointmentId = appt3.id_cita;
  planAbonosAppointmentId = appt4.id_cita;
  planAbonosMontoAppointmentId = appt5.id_cita;
  planAbonosGuardAppointmentId = appt6.id_cita;
  pagoUnicoAppointmentId = appt7.id_cita;

  // Use first seeded service
  const service = await AppDataSource.getRepository(Service).findOne({ where: {} });
  serviceId = service!.id_servicio;

  const metodoPago = await AppDataSource.getRepository(PaymentMethod).findOne({ where: {} });
  metodoPagoId = metodoPago!.id_metodo_pago;
});

describe("POST /api/appointments/:id/create-sale", () => {
  it("creates sale + details from a Completada appointment", async () => {
    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/create-sale`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        servicios: [{ id_servicio: serviceId, precio: 150000 }],
        observacion: "Test integration",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id_venta).toBeDefined();
    expect(res.body.data.total).toBe(150000);

    // La cita permanece Completada (id=2)
    const appt = await AppDataSource.getRepository(Appointment).findOne({
      where: { id_cita: appointmentId },
      relations: ["appointmentStatus"],
    });
    expect(appt!.appointmentStatus.id_estado_cita).toBe(2);

    // Efecto de la transacción: la venta existe en BD con el total correcto
    const sale = await AppDataSource.getRepository(Sale)
      .findOneBy({ id_venta: res.body.data.id_venta });
    expect(sale).not.toBeNull();
    expect(Number(sale!.total)).toBe(150000);
  });

  it("returns 409 when the appointment is not Completada", async () => {
    const res = await request(app)
      .post(`/api/appointments/${pendingAppointmentId}/create-sale`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ servicios: [{ id_servicio: serviceId, precio: 80000 }] });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("returns 409 when appointment already has a sale", async () => {
    const res = await request(app)
      .post(`/api/appointments/${appointmentId}/create-sale`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ servicios: [{ id_servicio: serviceId, precio: 50000 }] });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for non-existent appointment", async () => {
    const res = await request(app)
      .post("/api/appointments/99999/create-sale")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ servicios: [{ id_servicio: serviceId, precio: 100000 }] });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post(`/api/appointments/${dupAppointmentId}/create-sale`)
      .send({ servicios: [{ id_servicio: serviceId, precio: 100000 }] });

    expect(res.status).toBe(401);
  });

  it("returns 422 when servicios array is empty (Zod validation)", async () => {
    const res = await request(app)
      .post(`/api/appointments/${dupAppointmentId}/create-sale`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ servicios: [] });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  // ── plan_abonos: todo el flujo (Venta + plan de abonos + primer abono) ──────
  it("creates sale + installment plan + first payment in one call (porcentaje_primer_abono)", async () => {
    const res = await request(app)
      .post(`/api/appointments/${planAbonosAppointmentId}/create-sale`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        servicios: [{ id_servicio: serviceId, precio: 200000 }],
        plan_abonos: { num_abonos: 2, porcentaje_primer_abono: 70, id_metodo_pago: metodoPagoId },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.abono).toEqual(
      expect.objectContaining({ monto: 140000, numero: 1 })
    );

    const sale = await AppDataSource.getRepository(Sale).findOneBy({ id_venta: res.body.data.id_venta });
    expect(sale!.num_abonos).toBe(2);
    expect(sale!.porcentaje_primer_abono).toBe(70);

    const pagos = await AppDataSource.getRepository(Payment).find({ where: { sale: { id_venta: res.body.data.id_venta } } });
    expect(pagos).toHaveLength(1);
    expect(Number(pagos[0].monto)).toBe(140000);
  });

  it("creates sale + first payment via monto_primer_abono (converted to percentage)", async () => {
    const res = await request(app)
      .post(`/api/appointments/${planAbonosMontoAppointmentId}/create-sale`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        servicios: [{ id_servicio: serviceId, precio: 100000 }],
        plan_abonos: { num_abonos: 2, monto_primer_abono: 60000, id_metodo_pago: metodoPagoId },
      });

    expect(res.status).toBe(201);
    // 60000/100000 = 60% -> mismo abono
    expect(res.body.data.abono).toEqual(
      expect.objectContaining({ monto: 60000, numero: 1 })
    );

    const sale = await AppDataSource.getRepository(Sale).findOneBy({ id_venta: res.body.data.id_venta });
    expect(sale!.porcentaje_primer_abono).toBe(60);
  });

  // ── Pago único: num_abonos = 1 -> porcentaje_primer_abono = 100 ─────────────
  // Antes rechazado por el schema (max 99) y por el guard manual del
  // controller — 100% ahora es válido siempre que venga junto a
  // num_abonos = 1 en el mismo body (ver refine en appointment.schemas.ts).
  it("creates sale as a single full payment (num_abonos=1, porcentaje_primer_abono=100)", async () => {
    const res = await request(app)
      .post(`/api/appointments/${pagoUnicoAppointmentId}/create-sale`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        servicios: [{ id_servicio: serviceId, precio: 300000 }],
        plan_abonos: { num_abonos: 1, porcentaje_primer_abono: 100, id_metodo_pago: metodoPagoId },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.abono).toEqual(
      expect.objectContaining({ monto: 300000, numero: 1 })
    );

    const sale = await AppDataSource.getRepository(Sale).findOneBy({ id_venta: res.body.data.id_venta });
    expect(sale!.num_abonos).toBe(1);
    expect(sale!.porcentaje_primer_abono).toBe(100);

    const pagos = await AppDataSource.getRepository(Payment).find({ where: { sale: { id_venta: res.body.data.id_venta } } });
    expect(pagos).toHaveLength(1);
    expect(Number(pagos[0].monto)).toBe(300000);
  });

  it("returns 422 when porcentaje_primer_abono=100 is sent without num_abonos=1", async () => {
    const res = await request(app)
      .post(`/api/appointments/${planAbonosGuardAppointmentId}/create-sale`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        servicios: [{ id_servicio: serviceId, precio: 100000 }],
        plan_abonos: { num_abonos: 2, porcentaje_primer_abono: 100, id_metodo_pago: metodoPagoId },
      });

    expect(res.status).toBe(422);
  });

  it("returns 422 when plan_abonos is missing id_metodo_pago", async () => {
    const res = await request(app)
      .post(`/api/appointments/${planAbonosGuardAppointmentId}/create-sale`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        servicios: [{ id_servicio: serviceId, precio: 100000 }],
        plan_abonos: { num_abonos: 2 },
      });

    expect(res.status).toBe(422);
  });

  it("returns 404 when plan_abonos.id_metodo_pago does not exist (rolls back the whole sale)", async () => {
    const res = await request(app)
      .post(`/api/appointments/${planAbonosGuardAppointmentId}/create-sale`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        servicios: [{ id_servicio: serviceId, precio: 100000 }],
        plan_abonos: { num_abonos: 2, porcentaje_primer_abono: 50, id_metodo_pago: 999999 },
      });

    expect(res.status).toBe(404);

    // Nada quedó a medias: ni la venta ni el pago se crearon
    const sale = await AppDataSource.getRepository(Sale).findOne({
      where: { appointment: { id_cita: planAbonosGuardAppointmentId } },
    });
    expect(sale).toBeNull();
  });
});
