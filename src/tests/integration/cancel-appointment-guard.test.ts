import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Client } from "../../models/Client";
import { Appointment } from "../../models/Appointment";
import { AppointmentStatus } from "../../models/AppointmentStatus";

// Una cita Cancelada es un estado terminal: no debe poder editarse (PUT) ni
// cambiar de estado (PATCH), igual que ya ocurre con Cancelado en DetalleVenta.

let adminToken: string;
let client: Client;
let pendiente: AppointmentStatus, cancelada: AppointmentStatus, confirmada: AppointmentStatus;

let cancelledAppointmentId: number;
let pendingAppointmentId: number;

const loadAppointment = (id_cita: number) =>
  AppDataSource.getRepository(Appointment).findOne({
    where: { id_cita },
    relations: ["appointmentStatus"],
  });

beforeAll(async () => {
  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;

  const clientRepo = AppDataSource.getRepository(Client);
  client = await clientRepo.save(
    clientRepo.create({
      tipoDocumento: "CC", documento: "77770001", nombre: "Test Cancel Guard",
      correo: "cancelguard@test.com", telefono: "3007778800", estado: true,
    }),
  );

  const estadoRepo = AppDataSource.getRepository(AppointmentStatus);
  pendiente  = (await estadoRepo.findOneBy({ nombre: "Pendiente" }))!;
  cancelada  = (await estadoRepo.findOneBy({ nombre: "Cancelada" }))!;
  confirmada = (await estadoRepo.findOneBy({ nombre: "Confirmada" }))!;

  const citaRepo = AppDataSource.getRepository(Appointment);
  cancelledAppointmentId = (
    await citaRepo.save(citaRepo.create({
      fecha: new Date("2026-03-01"), hora: "10:00:00", client, appointmentStatus: cancelada,
    }))
  ).id_cita;
  pendingAppointmentId = (
    await citaRepo.save(citaRepo.create({
      fecha: new Date("2026-03-02"), hora: "11:00:00", client, appointmentStatus: pendiente,
    }))
  ).id_cita;
});

describe("seedAppointmentStatus", () => {
  it("includes Confirmada without disturbing the existing estados", () => {
    expect(confirmada).toBeDefined();
    expect(pendiente).toBeDefined();
    expect(cancelada).toBeDefined();
  });
});

describe("PUT /api/appointments/:id — guard de cita cancelada", () => {
  it("returns 409 for a cancelled appointment and changes nothing", async () => {
    const res = await request(app)
      .put(`/api/appointments/${cancelledAppointmentId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ hora: "15:00:00" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    const cita = await loadAppointment(cancelledAppointmentId);
    expect(cita!.hora.slice(0, 8)).toBe("10:00:00");
  });

  it("still allows editing a non-cancelled appointment", async () => {
    const res = await request(app)
      .put(`/api/appointments/${pendingAppointmentId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ hora: "12:30:00" });

    expect(res.status).toBe(200);
    const cita = await loadAppointment(pendingAppointmentId);
    expect(cita!.hora.slice(0, 8)).toBe("12:30:00");
  });
});

describe("PATCH /api/appointment-status/cita/:id_cita/estado — guard de cita cancelada", () => {
  it("returns 409 for a cancelled appointment and changes nothing", async () => {
    const res = await request(app)
      .patch(`/api/appointment-status/cita/${cancelledAppointmentId}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado_cita: confirmada.id_estado_cita });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    const cita = await loadAppointment(cancelledAppointmentId);
    expect(cita!.appointmentStatus.nombre).toBe("Cancelada");
  });

  it("still allows changing status for a non-cancelled appointment", async () => {
    const res = await request(app)
      .patch(`/api/appointment-status/cita/${pendingAppointmentId}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado_cita: confirmada.id_estado_cita });

    expect(res.status).toBe(200);
    const cita = await loadAppointment(pendingAppointmentId);
    expect(cita!.appointmentStatus.nombre).toBe("Confirmada");
  });

  it("returns 404 for a non-existent appointment", async () => {
    const res = await request(app)
      .patch("/api/appointment-status/cita/99999/estado")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ id_estado_cita: confirmada.id_estado_cita });

    expect(res.status).toBe(404);
  });
});
