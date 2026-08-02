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
let clientId: number;
let appointmentId: number;   // Completada, fecha 2025-12-10
let serviceId: number;

beforeAll(async () => {
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ correo: "admin@softwart.com", clave: "Admin1234!" });
  adminToken = loginRes.body.token;

  const clientRepo = AppDataSource.getRepository(Client);
  const client = await clientRepo.save(
    clientRepo.create({
      tipoDocumento: "CC",
      documento: "77777777",
      nombre: "Test Date Cascade",
      correo: "datecascade@test.com",
      telefono: "3009999998",
      estado: true,
    })
  );
  clientId = client.id_cliente;

  const statusRepo = AppDataSource.getRepository(AppointmentStatus);
  const completada = await statusRepo.findOneBy({ id_estado_cita: 2 });

  const apptRepo = AppDataSource.getRepository(Appointment);
  const appt = await apptRepo.save(
    apptRepo.create({ fecha: new Date("2025-12-10"), hora: "14:00:00", client, appointmentStatus: completada! })
  );
  appointmentId = appt.id_cita;

  const service = await AppDataSource.getRepository(Service).findOne({ where: {} });
  serviceId = service!.id_servicio;
});

describe("Teléfono — exactamente 10 dígitos, prefijo 3", () => {
  it("rechaza un teléfono que no empieza en 3 (registro)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      tipoDocumento: "CC",
      documento: "900111222",
      nombre: "Juan Prefijo Invalido",
      correo: "prefijoinvalido@test.com",
      clave: "Clave123!",
      telefono: "2001234567",
      acceptTerms: true,
    });
    expect(res.status).toBe(422);
  });

  it("rechaza un teléfono con menos de 10 dígitos (registro)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      tipoDocumento: "CC",
      documento: "900111223",
      nombre: "Juan Telefono Corto",
      correo: "telefonocorto@test.com",
      clave: "Clave123!",
      telefono: "300123456",
      acceptTerms: true,
    });
    expect(res.status).toBe(422);
  });

  it("acepta un teléfono válido (10 dígitos, empieza en 3)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      tipoDocumento: "CC",
      documento: "900111224",
      nombre: "Juan Telefono Valido",
      correo: "telefonovalido@test.com",
      clave: "Clave123!",
      telefono: "3001234567",
      acceptTerms: true,
    });
    expect(res.status).toBe(201);
  });
});

describe("Correo — regex de TLD más realista", () => {
  it("rechaza un TLD de un solo carácter", async () => {
    const res = await request(app).post("/api/auth/register").send({
      tipoDocumento: "CC",
      documento: "900111225",
      nombre: "Juan Correo Invalido",
      correo: "usuario@sitio.c",
      clave: "Clave123!",
      acceptTerms: true,
    });
    expect(res.status).toBe(422);
  });
});

describe("Cascada de fechas — Venta manual vs Cita", () => {
  it("rechaza una Venta manual vinculada a una Cita con fecha anterior a la de la Cita", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2025-12-01", total: 100000, id_cita: appointmentId, id_cliente: clientId });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rechaza una segunda Venta manual para una Cita que ya tiene venta (409, mensaje explícito)", async () => {
    const primera = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2025-12-10", total: 100000, id_cita: appointmentId, id_cliente: clientId });
    expect(primera.status).toBe(201);

    const segunda = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2025-12-11", total: 50000, id_cita: appointmentId, id_cliente: clientId });

    expect(segunda.status).toBe(409);
    expect(segunda.body.message).toBe("Esta cita ya tiene una venta registrada");
  });

  it("acepta una Venta manual con fecha igual o posterior a la de la Cita", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2025-12-15", total: 100000, id_cliente: clientId });

    expect(res.status).toBe(201);
  });
});

describe("Cascada de fechas — Servicio (SaleDetail) vs Venta", () => {
  let ventaId: number;

  beforeAll(async () => {
    const venta = await AppDataSource.getRepository(Sale).save(
      AppDataSource.getRepository(Sale).create({
        fecha: new Date("2025-12-15"),
        total: 100000,
        estado: true,
      })
    );
    ventaId = venta.id_venta;
  });

  it("rechaza un servicio con fecha anterior a la de su Venta", async () => {
    const res = await request(app)
      .post("/api/sale-details")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2025-12-01", precio: 100000, id_venta: ventaId, id_servicio: serviceId });

    expect(res.status).toBe(400);
  });

  it("rechaza un servicio con fecha más de 3 meses posterior a la de su Venta", async () => {
    const res = await request(app)
      .post("/api/sale-details")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2026-04-01", precio: 100000, id_venta: ventaId, id_servicio: serviceId });

    expect(res.status).toBe(400);
  });

  it("acepta un servicio con fecha dentro de la ventana de 3 meses desde la Venta", async () => {
    const res = await request(app)
      .post("/api/sale-details")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2026-01-10", precio: 100000, id_venta: ventaId, id_servicio: serviceId });

    expect(res.status).toBe(201);
  });
});

describe("Cascada de fechas — Pago vs Venta", () => {
  let ventaId: number;

  beforeAll(async () => {
    const venta = await AppDataSource.getRepository(Sale).save(
      AppDataSource.getRepository(Sale).create({
        fecha: new Date("2025-12-15"),
        total: 100000,
        num_abonos: 2,
        porcentaje_primer_abono: 70,
        estado: true,
      })
    );
    ventaId = venta.id_venta;
  });

  it("rechaza un pago con fecha anterior a la de su Venta", async () => {
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2025-12-01", monto: 70000, id_venta: ventaId });

    expect(res.status).toBe(400);
  });

  it("acepta un pago con fecha igual o posterior a la de su Venta", async () => {
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2025-12-20", monto: 70000, id_venta: ventaId });

    expect(res.status).toBe(201);
  });
});

describe("Límite de fecha futura (3 meses) en fechaISO", () => {
  it("rechaza una fecha de Venta más de 3 meses en el futuro", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fecha: "2099-01-01", total: 100000, id_cliente: clientId });

    expect(res.status).toBe(422);
  });
});
