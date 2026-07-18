import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Client } from "../../models/Client";
import { Appointment } from "../../models/Appointment";
import { AppointmentStatus } from "../../models/AppointmentStatus";

// Control OWASP A01 (Broken Access Control) — variante IDOR:
// el :id de la cita lo elige el atacante, así que el backend debe verificar
// la propiedad del recurso contra el id_cliente del JWT, no confiar en la URL.

let tokenA: string; // dueño de las citas
let tokenB: string; // atacante
let adminToken: string;

let apptIdorId: number;      // de A — B intentará cancelarla
let apptOwnId: number;       // de A — A la cancela (caso feliz)
let apptCompletedId: number; // de A — estado Completada, no cancelable

const registerAndLogin = async (correo: string, documento: string, nombre: string) => {
  await request(app).post("/api/auth/register").send({
    tipoDocumento: "CC", documento, nombre, correo,
    clave: "Cliente1234!", telefono: "3001112233",
  });
  const login = await request(app).post("/api/auth/login").send({ correo, clave: "Cliente1234!" });
  return login.body.token as string;
};

beforeAll(async () => {
  tokenA = await registerAndLogin("idor.a@test.com", "77770001", "Cliente A");
  tokenB = await registerAndLogin("idor.b@test.com", "77770002", "Cliente B");

  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;

  const clientA = await AppDataSource.getRepository(Client).findOneBy({ correo: "idor.a@test.com" });

  const statusRepo = AppDataSource.getRepository(AppointmentStatus);
  const pendiente = await statusRepo.findOneBy({ id_estado_cita: 1 });
  const completada = await statusRepo.findOneBy({ id_estado_cita: 2 });

  // Fechas relativas a "ahora" (no hardcoded): cancelMyAppointment bloquea con
  // 400 si faltan <6h para la cita, así que el fixture debe quedar siempre en
  // el futuro sin importar cuándo corra la suite.
  const enDias = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

  const apptRepo = AppDataSource.getRepository(Appointment);
  const [a1, a2, a3] = await apptRepo.save([
    apptRepo.create({ fecha: enDias(10), hora: "14:00:00", client: clientA!, appointmentStatus: pendiente! }),
    apptRepo.create({ fecha: enDias(11), hora: "15:00:00", client: clientA!, appointmentStatus: pendiente! }),
    apptRepo.create({ fecha: enDias(12), hora: "16:00:00", client: clientA!, appointmentStatus: completada! }),
  ]);
  apptIdorId = a1.id_cita;
  apptOwnId = a2.id_cita;
  apptCompletedId = a3.id_cita;
});

const statusOf = async (id_cita: number) => {
  const appt = await AppDataSource.getRepository(Appointment).findOne({
    where: { id_cita },
    relations: ["appointmentStatus"],
  });
  return appt!.appointmentStatus.id_estado_cita;
};

describe("PATCH /api/account/citas/:id/cancelar — control de acceso", () => {
  it("returns 403 when a client cancels another client's appointment (IDOR)", async () => {
    const res = await request(app)
      .patch(`/api/account/citas/${apptIdorId}/cancelar`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    // El guard no solo responde 403: no debe haber tocado la cita.
    expect(await statusOf(apptIdorId)).toBe(1);
  });

  it("returns 403 for an admin (no id_cliente in the token)", async () => {
    const res = await request(app)
      .patch(`/api/account/citas/${apptIdorId}/cancelar`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).patch(`/api/account/citas/${apptIdorId}/cancelar`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for a non-existent appointment", async () => {
    const res = await request(app)
      .patch("/api/account/citas/99999/cancelar")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
  });

  it("returns 400 when the appointment is not Pendiente", async () => {
    const res = await request(app)
      .patch(`/api/account/citas/${apptCompletedId}/cancelar`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(await statusOf(apptCompletedId)).toBe(2);
  });

  it("cancels the appointment when the owner requests it", async () => {
    const res = await request(app)
      .patch(`/api/account/citas/${apptOwnId}/cancelar`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(await statusOf(apptOwnId)).toBe(4); // Cancelada
  });
});
