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

let adminToken: string;
let appointmentId: number;
let dupAppointmentId: number;
let serviceId: number;

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

  // Get Pendiente status (id=1, seeded)
  const pendiente = await AppDataSource.getRepository(AppointmentStatus)
    .findOneBy({ id_estado_cita: 1 });

  // Create two appointments for different test cases
  const apptRepo = AppDataSource.getRepository(Appointment);
  const [appt1, appt2] = await apptRepo.save([
    apptRepo.create({ fecha: new Date("2025-12-10"), hora: "14:00:00", client, appointmentStatus: pendiente! }),
    apptRepo.create({ fecha: new Date("2025-12-11"), hora: "15:00:00", client, appointmentStatus: pendiente! }),
  ]);
  appointmentId = appt1.id_cita;
  dupAppointmentId = appt2.id_cita;

  // Use first seeded service
  const service = await AppDataSource.getRepository(Service).findOne({ where: {} });
  serviceId = service!.id_servicio;
});

describe("POST /api/appointments/:id/create-sale", () => {
  it("creates sale + details and marks appointment as Completada (id=2)", async () => {
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

    // Appointment status must be Completada (id=2)
    const appt = await AppDataSource.getRepository(Appointment).findOne({
      where: { id_cita: appointmentId },
      relations: ["appointmentStatus"],
    });
    expect(appt!.appointmentStatus.id_estado_cita).toBe(2);

    // Sale must exist with correct total
    const sale = await AppDataSource.getRepository(Sale)
      .findOneBy({ id_venta: res.body.data.id_venta });
    expect(sale).not.toBeNull();
    expect(Number(sale!.total)).toBe(150000);
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
});
