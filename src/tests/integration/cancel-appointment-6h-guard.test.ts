import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Client } from "../../models/Client";
import { Appointment } from "../../models/Appointment";
import { AppointmentStatus } from "../../models/AppointmentStatus";
import { bogotaNowMs } from "../../helpers/bogotaTime.helper";

// cancelMyAppointment (ClientAccountController) bloquea cancelar si faltan
// <6h para la cita — pero comparaba fecha+hora (naive-Bogotá) contra
// NOW() crudo de Postgres (UTC en Render), un desfase de ~5h que dejaba el
// guard efectivamente mal calibrado. Ningún test anterior probaba la
// PRECISIÓN horaria del guard (solo el estado terminal/IDOR), así que el bug
// pasó desapercibido — este archivo cierra ese hueco.

let clientToken: string;
let client: Client;
let pendiente: AppointmentStatus;

// Convierte un instante UTC (ms) a los componentes de fecha/hora que
// representaría en Bogotá (UTC-5 fijo, sin DST) — inverso de bogotaNowMs().
function bogotaPartsFromMs(ms: number): { fecha: string; hora: string } {
  const d = new Date(ms - 5 * 60 * 60 * 1000);
  const fecha = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const hora = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;
  return { fecha, hora };
}

const seedAppointment = async (offsetHours: number): Promise<number> => {
  const { fecha, hora } = bogotaPartsFromMs(bogotaNowMs() + offsetHours * 60 * 60 * 1000);
  const [y, m, d] = fecha.split("-").map(Number);
  // TypeORM serializa la columna `date` con los getters LOCALES del Date, no
  // los UTC — new Date(fecha) (parseo de string, medianoche UTC) se corre un
  // día si el proceso corre en una TZ con offset negativo (como este entorno
  // local, America/Bogota). Constructor local (y, m-1, d) evita el desfase.
  const citaRepo = AppDataSource.getRepository(Appointment);
  const cita = await citaRepo.save(
    citaRepo.create({ fecha: new Date(y, m - 1, d), hora, client, appointmentStatus: pendiente }),
  );
  return cita.id_cita;
};

const statusOf = async (id_cita: number) => {
  const appt = await AppDataSource.getRepository(Appointment).findOne({
    where: { id_cita },
    relations: ["appointmentStatus"],
  });
  return appt!.appointmentStatus.id_estado_cita;
};

beforeAll(async () => {
  await request(app).post("/api/auth/register").send({
    tipoDocumento: "CC", documento: "77770099", nombre: "Test Cancel Window",
    correo: "sixhourguard@test.com", clave: "Cliente1234!", telefono: "3007778899", acceptTerms: true,
  });
  clientToken = (
    await request(app).post("/api/auth/login").send({ correo: "sixhourguard@test.com", clave: "Cliente1234!" })
  ).body.token;

  client = (await AppDataSource.getRepository(Client).findOneBy({ correo: "sixhourguard@test.com" }))!;
  pendiente = (await AppDataSource.getRepository(AppointmentStatus).findOneBy({ id_estado_cita: 1 }))!;
});

describe("PATCH /api/account/citas/:id/cancelar — precisión del guard de 6h", () => {
  it("returns 400 when the appointment is 4h away (inside the 6h window) and does not cancel it", async () => {
    const id_cita = await seedAppointment(4);

    const res = await request(app)
      .patch(`/api/account/citas/${id_cita}/cancelar`)
      .set("Authorization", `Bearer ${clientToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("menos de 6 horas");
    expect(await statusOf(id_cita)).toBe(1); // sigue Pendiente
  });

  it("allows cancelling when the appointment is 8h away (outside the 6h window)", async () => {
    const id_cita = await seedAppointment(8);

    const res = await request(app)
      .patch(`/api/account/citas/${id_cita}/cancelar`)
      .set("Authorization", `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(await statusOf(id_cita)).toBe(4); // Cancelada
  });
});
