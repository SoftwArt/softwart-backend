import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Appointment } from "../../models/Appointment";
import { AppointmentStatus } from "../../models/AppointmentStatus";

// Cubre dos guards de Citas de este sprint sin prueba hasta ahora:
// - existeCitaEnHorario: no se puede doblar-reservar la misma fecha+hora.
// - excedeLimiteCitasActivas: tope anti-DoS de citas activas por cliente,
//   aplicado tanto en el panel admin como en "agendar sin cuenta" (público).

let adminToken: string;

// Fechas relativas a "hoy" (nunca hardcodeadas) — el guard rechaza fechas
// pasadas, y un valor fijo del pasado se volvería inválido con el tiempo.
const futureDate = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);

const guestAppointment = (overrides: Partial<Record<string, unknown>> = {}) =>
  request(app).post("/api/auth/guest-appointment").send({
    tipoDocumento: "CC", documento: "88880003", nombre: "Test Appointment Guards",
    correo: "appointmentguards@test.com", telefono: "3007778833",
    fecha: futureDate(10), hora: "13:00",
    ...overrides,
  });

beforeAll(async () => {
  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;
}, 30000);

describe("existeCitaEnHorario — no se puede doblar-reservar la misma fecha+hora", () => {
  it("409 al intentar agendar (sin cuenta) el mismo horario ya ocupado", async () => {
    const first = await guestAppointment({ fecha: futureDate(11), hora: "14:00" });
    expect(first.status).toBe(201);

    const second = await guestAppointment({
      documento: "88880004", correo: "otro.cliente@test.com", fecha: futureDate(11), hora: "14:00",
    });
    expect(second.status).toBe(409);
  });

  it("cancelar la cita libera el slot para volver a agendarlo", async () => {
    const first = await guestAppointment({ fecha: futureDate(12), hora: "15:00" });
    expect(first.status).toBe(201);
    const id_cita = first.body.data.id_cita;

    const cancelada = (await AppDataSource.getRepository(AppointmentStatus).findOneBy({ nombre: "Cancelada" }))!;
    await AppDataSource.getRepository(Appointment).update({ id_cita }, { appointmentStatus: cancelada });

    const second = await guestAppointment({
      documento: "88880005", correo: "otro.cliente2@test.com", fecha: futureDate(12), hora: "15:00",
    });
    expect(second.status).toBe(201);
  });

  it("el panel admin respeta el mismo guard (POST /api/appointments)", async () => {
    const guest = await guestAppointment({ fecha: futureDate(13), hora: "16:00" });
    expect(guest.status).toBe(201);

    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: futureDate(13), hora: "16:00" });

    expect(res.status).toBe(409);
  });
});

describe("excedeLimiteCitasActivas — tope anti-DoS de citas activas por cliente", () => {
  it("permite hasta 3 citas activas y bloquea la 4ª con 409", async () => {
    const doc = "88880006";
    const correo = "limite.citas@test.com";

    const r1 = await guestAppointment({ documento: doc, correo, fecha: futureDate(20), hora: "13:00" });
    expect(r1.status).toBe(201);
    const r2 = await guestAppointment({ documento: doc, correo, fecha: futureDate(21), hora: "13:00" });
    expect(r2.status).toBe(201);
    const r3 = await guestAppointment({ documento: doc, correo, fecha: futureDate(22), hora: "13:00" });
    expect(r3.status).toBe(201);

    const r4 = await guestAppointment({ documento: doc, correo, fecha: futureDate(23), hora: "13:00" });
    expect(r4.status).toBe(409);
  });
});
