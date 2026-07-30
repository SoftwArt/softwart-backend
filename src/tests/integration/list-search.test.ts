import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app";
import "../setup";
import { AppDataSource } from "../../data-source";
import { Client } from "../../models/Client";
import { Sale } from "../../models/Sale";
import { Payment } from "../../models/Payment";
import { PaymentStatus } from "../../models/PaymentStatus";
import { PaymentMethod } from "../../models/PaymentMethod";

// Cubre el fix "nivel 2" del cap de 100 filas (ver REPORTE.md de la suite
// E2E): GET /api/clients y GET /api/sales ganan un ?q= opcional para que el
// Combobox de selección pueda buscar más allá del top-100 por recencia.
// Ningún endpoint de listado tenía búsqueda por texto antes de esto — es la
// primera prueba de comportamiento de búsqueda/paginación para ambos.

let adminToken: string;
let clienteBuscable: Client;
let clienteOtro: Client;
let ventaBuscable: Sale;
let ventaConDosPagos: Sale;

beforeAll(async () => {
  adminToken = (
    await request(app).post("/api/auth/login").send({ correo: "admin@softwart.com", clave: "Admin1234!" })
  ).body.token;

  const clienteRepo = AppDataSource.getRepository(Client);
  clienteBuscable = await clienteRepo.save(
    clienteRepo.create({
      tipoDocumento: "CC", documento: "77770099", nombre: "Zzzuniga Buscable Unico",
      correo: "zzzuniga.buscable@test.com", telefono: "3001112233", estado: true,
    }),
  );
  clienteOtro = await clienteRepo.save(
    clienteRepo.create({
      tipoDocumento: "CC", documento: "77770088", nombre: "Cliente Sin Relacion",
      correo: "sinrelacion@test.com", telefono: "3004445566", estado: true,
    }),
  );

  const ventaRepo = AppDataSource.getRepository(Sale);
  ventaBuscable = await ventaRepo.save(
    ventaRepo.create({ fecha: new Date("2026-05-01"), total: 150000, estado: true, client: clienteBuscable }),
  );
  ventaConDosPagos = await ventaRepo.save(
    ventaRepo.create({ fecha: new Date("2026-05-02"), total: 300000, estado: true, num_abonos: 2, client: clienteOtro }),
  );

  const metodo = (await AppDataSource.getRepository(PaymentMethod).findOne({ where: {} }))!;
  const pendiente = (await AppDataSource.getRepository(PaymentStatus).findOneBy({ nombre: "Pendiente" }))!;
  const pagoRepo = AppDataSource.getRepository(Payment);
  await pagoRepo.save(
    pagoRepo.create({ fecha: new Date("2026-05-02"), monto: 150000, sale: ventaConDosPagos, paymentMethod: metodo, paymentStatus: pendiente }),
  );
  await pagoRepo.save(
    pagoRepo.create({ fecha: new Date("2026-05-03"), monto: 150000, sale: ventaConDosPagos, paymentMethod: metodo, paymentStatus: pendiente }),
  );
}, 30000);

describe("GET /api/clients?q= — búsqueda server-side", () => {
  it("q por fragmento de nombre trae solo los clientes que matchean", async () => {
    const res = await request(app)
      .get("/api/clients?q=Buscable Unico")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as Client[]).map((c) => c.id_cliente);
    expect(ids).toContain(clienteBuscable.id_cliente);
    expect(ids).not.toContain(clienteOtro.id_cliente);
  });

  it("q por fragmento de documento trae solo los clientes que matchean", async () => {
    const res = await request(app)
      .get(`/api/clients?q=${clienteBuscable.documento}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as Client[]).map((c) => c.id_cliente);
    expect(ids).toEqual([clienteBuscable.id_cliente]);
  });

  it("q que no matchea nada devuelve data vacía, no error", async () => {
    const res = await request(app)
      .get("/api/clients?q=StringQueDefinitivamenteNoExiste999")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it("sin q, comportamiento de paginación/orden idéntico al de siempre", async () => {
    const res = await request(app)
      .get("/api/clients?limit=5")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    const ids = (res.body.data as Client[]).map((c) => c.id_cliente);
    const sorted = [...ids].sort((a, b) => b - a);
    expect(ids).toEqual(sorted); // DESC por id, como antes del fix nivel 2
  });
});

describe("GET /api/sales?q= — búsqueda server-side", () => {
  it("q por id de venta trae solo esa venta", async () => {
    const res = await request(app)
      .get(`/api/sales?q=${ventaBuscable.id_venta}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as Sale[]).map((v) => v.id_venta);
    expect(ids).toContain(ventaBuscable.id_venta);
  });

  it("q por fragmento de nombre del cliente relacionado trae solo esa venta", async () => {
    const res = await request(app)
      .get("/api/sales?q=Buscable Unico")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data as Sale[]).map((v) => v.id_venta);
    expect(ids).toEqual([ventaBuscable.id_venta]);
  });

  it("q que no matchea nada devuelve data vacía, no error", async () => {
    const res = await request(app)
      .get("/api/sales?q=StringQueDefinitivamenteNoExiste999")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it("caso crítico: una venta con 2 pagos no se cuenta ni aparece duplicada (sin fan-out del join)", async () => {
    const res = await request(app)
      .get(`/api/sales?q=${ventaConDosPagos.id_venta}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const coincidencias = (res.body.data as Sale[]).filter((v) => v.id_venta === ventaConDosPagos.id_venta);
    expect(coincidencias).toHaveLength(1);
    expect(coincidencias[0].payments).toHaveLength(2);
    expect(res.body.meta.total).toBe(1);
  });

  it("sin q, comportamiento de paginación/orden idéntico al de siempre", async () => {
    const res = await request(app)
      .get("/api/sales?limit=5")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    const ids = (res.body.data as Sale[]).map((v) => v.id_venta);
    const sorted = [...ids].sort((a, b) => b - a);
    expect(ids).toEqual(sorted); // DESC por id, como antes del fix nivel 2
  });
});
