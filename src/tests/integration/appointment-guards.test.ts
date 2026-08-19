import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Appointment } from "../../models/Appointment";
import { AppointmentStatus } from "../../models/AppointmentStatus";

// Cubre dos guards de Citas sin prueba hasta ahora:
// - existeCitaEnHorario: no se puede doblar-reservar la misma fecha+hora.
// - excedeLimiteCitasActivas: tope anti-DoS de citas activas por cliente.
// Antes se probaban vía "agendar sin cuenta" (guestAppointment), que se
// eliminó del sistema — ambos guards también corren en el flujo autenticado
// (ClientAccountController.createMyAppointment, POST /api/account/citas), así
// que se reescribe sobre ese endpoint para no perder cobertura.

let adminToken: string;

// Fechas relativas a "hoy" (nunca hardcodeadas) — el guard rechaza fechas
// pasadas, y un valor fijo del pasado se volvería inválido con el tiempo.
const futureDate = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);

let clientCounter = 0;
const registerAndLogin = async (): Promise<string> => {
  clientCounter += 1;
  const correo = `appt.guard.${clientCounter}@test.com`;
  await request(app).post("/api/auth/register").send({
    tipoDocumento: "CC", documento: `8888${String(clientCounter).padStart(4, "0")}`,
    nombre: "Test Appointment Guards", correo, clave: "Cliente1234!",
    telefono: "3007778833", acceptTerms: true,
  });
  const login = await request(app).post("/api/auth/login").send({ correo, clave: "Cliente1234!" });
  return login.body.token as string;
};

const crearCita = (token: string, overrides: Partial<Record<string, unknown>> = {}) =>
  request(app)
    .post("/api/account/citas")
    .set("Authorization", `Bearer ${token}`)
    .send({ fecha: futureDate(10), hora: "13:00", ...overrides });

beforeAll(async () => {
  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;
}, 30000);

describe("existeCitaEnHorario — no se puede doblar-reservar la misma fecha+hora", () => {
  it("409 al intentar agendar (cliente) el mismo horario ya ocupado", async () => {
    const tokenA = await registerAndLogin();
    const tokenB = await registerAndLogin();

    const first = await crearCita(tokenA, { fecha: futureDate(11), hora: "14:00" });
    expect(first.status).toBe(201);

    const second = await crearCita(tokenB, { fecha: futureDate(11), hora: "14:00" });
    expect(second.status).toBe(409);
  });

  it("cancelar la cita libera el slot para volver a agendarlo", async () => {
    const tokenA = await registerAndLogin();
    const tokenB = await registerAndLogin();

    const first = await crearCita(tokenA, { fecha: futureDate(12), hora: "15:00" });
    expect(first.status).toBe(201);
    const id_cita = first.body.data.id_cita;

    const cancelada = (await AppDataSource.getRepository(AppointmentStatus).findOneBy({ nombre: "Cancelada" }))!;
    await AppDataSource.getRepository(Appointment).update({ id_cita }, { appointmentStatus: cancelada });

    const second = await crearCita(tokenB, { fecha: futureDate(12), hora: "15:00" });
    expect(second.status).toBe(201);
  });

  it("el panel admin respeta el mismo guard (POST /api/appointments)", async () => {
    const tokenA = await registerAndLogin();
    const guest = await crearCita(tokenA, { fecha: futureDate(13), hora: "16:00" });
    expect(guest.status).toBe(201);

    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: futureDate(13), hora: "16:00" });

    expect(res.status).toBe(409);
  });

  it("crea la cita admin como Confirmada cuando no se envía estado", async () => {
    await registerAndLogin();
    const login = await request(app).post("/api/auth/login").send({
      correo: `appt.guard.${clientCounter}@test.com`,
      clave: "Cliente1234!",
    });

    const res = await request(app)
      .post("/api/appointments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_cliente: login.body.data.id_cliente, fecha: futureDate(14), hora: "17:00" });

    expect(res.status).toBe(201);
    expect(res.body.data.appointmentStatus.nombre).toBe("Confirmada");
  });
});

describe("excedeLimiteCitasActivas — tope anti-DoS de citas activas por cliente", () => {
  it("permite hasta 3 citas activas y bloquea la 4ª con 409", async () => {
    const token = await registerAndLogin();

    const r1 = await crearCita(token, { fecha: futureDate(20), hora: "13:00" });
    expect(r1.status).toBe(201);
    const r2 = await crearCita(token, { fecha: futureDate(21), hora: "13:00" });
    expect(r2.status).toBe(201);
    const r3 = await crearCita(token, { fecha: futureDate(22), hora: "13:00" });
    expect(r3.status).toBe(201);

    const r4 = await crearCita(token, { fecha: futureDate(23), hora: "13:00" });
    expect(r4.status).toBe(409);
  });
});
