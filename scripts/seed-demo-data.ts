// scripts/seed-demo-data.ts
//
// Rellena la base de datos con información de ejemplo realista, para usar
// en la presentación del proyecto: 3 usuarios internos adicionales al admin
// base, 2 clientes, 4 ventas, 5 pedidos (uno por cada tipo de servicio del
// catálogo), pagos consistentes con el plan de abonos de cada venta, 3
// marcos y 5 citas en distintos estados.
//
// No reemplaza a los seeds normales (roles, permisos, catálogos) — corre
// DESPUÉS de ellos, y asume que ya existen (se ejecutan solos al levantar
// el servidor). Pensado para dejar la app con datos de sobra para hacer un
// recorrido completo del sistema en una demo.
//
// Uso:
//   npm run seed:demo                                       (BD local, .env)
//   NODE_ENV=production DATABASE_URL=... npm run seed:demo  (Supabase)
//
// Si ya se corrió antes y se quiere repetir, primero limpiar con
// `npm run reset-data` (que además vuelve a correr los seeds base).
import * as bcrypt from "bcrypt";
import { AppDataSource } from "../src/data-source";
import { runAllSeeds } from "../src/seeds";
import { Role } from "../src/models/Role";
import { User } from "../src/models/User";
import { Client } from "../src/models/Client";
import { Frame } from "../src/models/Frame";
import { Service } from "../src/models/Service";
import { AppointmentStatus } from "../src/models/AppointmentStatus";
import { ServiceStatus } from "../src/models/ServiceStatus";
import { PaymentMethod } from "../src/models/PaymentMethod";
import { PaymentStatus } from "../src/models/PaymentStatus";
import { Appointment } from "../src/models/Appointment";
import { Sale } from "../src/models/Sale";
import { SaleDetail } from "../src/models/SaleDetail";
import { ServiceStatusHistory } from "../src/models/ServiceStatusHistory";
import { Payment } from "../src/models/Payment";
import { calculateInstallments } from "../src/helpers/installments.helper";

// Fechas relativas a "ahora", para que la demo siempre se vea reciente sin
// importar cuándo se corra el script. hace(n) = hoy - n días; en(n) = hoy + n días.
const hoy = new Date();
function diasDesde(offsetDias: number): Date {
  const d = new Date(hoy);
  d.setDate(d.getDate() + offsetDias);
  return d;
}
const hace = (n: number) => diasDesde(-n);
const en    = (n: number) => diasDesde(n);

async function main() {
  await AppDataSource.initialize();
  console.log("Conectado. Corriendo seeds base primero...");
  await runAllSeeds();

  const clienteRepo   = AppDataSource.getRepository(Client);
  const yaExiste = await clienteRepo.findOneBy({ correo: "mariana.torres@gmail.com" });
  if (yaExiste) {
    console.log("⚠️  Los datos de demo ya parecen estar sembrados (mariana.torres@gmail.com existe).");
    console.log("   Si quieres repetir desde cero: npm run reset-data && npm run seed:demo");
    await AppDataSource.destroy();
    return;
  }

  const rolRepo            = AppDataSource.getRepository(Role);
  const usuarioRepo        = AppDataSource.getRepository(User);
  const frameRepo          = AppDataSource.getRepository(Frame);
  const servicioRepo       = AppDataSource.getRepository(Service);
  const estadoCitaRepo     = AppDataSource.getRepository(AppointmentStatus);
  const estadoServicioRepo = AppDataSource.getRepository(ServiceStatus);
  const metodoPagoRepo     = AppDataSource.getRepository(PaymentMethod);
  const estadoPagoRepo     = AppDataSource.getRepository(PaymentStatus);
  const citaRepo           = AppDataSource.getRepository(Appointment);
  const ventaRepo          = AppDataSource.getRepository(Sale);
  const detalleRepo        = AppDataSource.getRepository(SaleDetail);
  const historialRepo      = AppDataSource.getRepository(ServiceStatusHistory);
  const pagoRepo           = AppDataSource.getRepository(Payment);

  const rolAdmin = await rolRepo.findOneByOrFail({ nombre: "Admin" });
  const rolCliente = await rolRepo.findOneByOrFail({ nombre: "Cliente" });

  const [estPendiente, estCompletada, estNoAsistio, estCancelada, estConfirmada] = await Promise.all(
    ["Pendiente", "Completada", "No Asistió", "Cancelada", "Confirmada"].map(nombre =>
      estadoCitaRepo.findOneByOrFail({ nombre })),
  );
  const [servSinEmpezar, servEnPreparacion, servFinalizado] = await Promise.all(
    ["Sin empezar", "En preparación", "Finalizado"].map(nombre =>
      estadoServicioRepo.findOneByOrFail({ nombre })),
  );
  const [metodoEfectivo, metodoTransferencia] = await Promise.all(
    ["Efectivo", "Transferencia"].map(nombre => metodoPagoRepo.findOneByOrFail({ nombre })),
  );
  const estadoValidado = await estadoPagoRepo.findOneByOrFail({ nombre: "Validado" });

  const [personalizacion, restauracion, enmarcacion, decoracion, texturizado] = await Promise.all(
    ["Personalización", "Restauración", "Enmarcación", "Decoración", "Texturizado"].map(nombre =>
      servicioRepo.findOneByOrFail({ nombre })),
  );

  // ── Marcos ────────────────────────────────────────────────────────────
  console.log("Creando marcos...");
  const marcosExistentes = await frameRepo.find();
  const [marco30, marco45] = await frameRepo.save(frameRepo.create([
    { codigo: "30-NOGAL", colilla: 30, precio_ensamblado: 65000, estado: true },
    { codigo: "45-DORADO", colilla: 45, precio_ensamblado: 98000, estado: true },
  ]));
  const marcoParaEnmarcacion = marcosExistentes[0] ?? marco30;

  // ── Usuarios internos (rol Admin — no existe rol Empleado) ──────────────
  console.log("Creando usuarios internos...");
  const claveDemo = await bcrypt.hash("Demo1234!", 10);
  await usuarioRepo.save(usuarioRepo.create([
    { correo: "silvana.salazar@artecafe.com", clave: claveDemo, estado: true, role: rolAdmin },
    { correo: "camila.restrepo@artecafe.com", clave: claveDemo, estado: true, role: rolAdmin },
    { correo: "andres.gomez@artecafe.com",    clave: claveDemo, estado: true, role: rolAdmin },
  ]));

  // ── Clientes (+ su cuenta de portal, mismo correo, rol Cliente) ─────────
  console.log("Creando clientes...");
  const mariana = await clienteRepo.save(clienteRepo.create({
    tipoDocumento: "CC",
    documento: "1035467892",
    nombre: "Mariana Torres Gómez",
    correo: "mariana.torres@gmail.com",
    telefono: "3116758234",
    estado: true,
  }));
  const juanPablo = await clienteRepo.save(clienteRepo.create({
    tipoDocumento: "CC",
    documento: "71987654",
    nombre: "Juan Pablo Restrepo Uribe",
    correo: "juanp.restrepo@gmail.com",
    telefono: "3007891245",
    estado: true,
  }));
  await usuarioRepo.save(usuarioRepo.create([
    { correo: mariana.correo,   clave: claveDemo, estado: true, role: rolCliente },
    { correo: juanPablo.correo, clave: claveDemo, estado: true, role: rolCliente },
  ]));

  // ── Citas (variedad de estados, para el catálogo completo) ──────────────
  console.log("Creando citas...");
  const citaCompletadaJuanPablo = await citaRepo.save(citaRepo.create({
    fecha: hace(6), hora: "14:00:00",
    observacion: "Trae un cuadro de gran formato para intervención con texturas.",
    appointmentStatus: estCompletada,
    client: juanPablo,
  }));
  await citaRepo.save(citaRepo.create([
    {
      fecha: hace(8), hora: "16:00:00",
      observacion: "Consulta inicial para enmarcar un diploma de grado.",
      appointmentStatus: estNoAsistio,
      client: mariana,
    },
    {
      fecha: hace(2), hora: "13:00:00",
      observacion: "Revisión de avance de la restauración del óleo familiar.",
      motivo_cancelacion: "La clienta reprogramó por un viaje imprevisto.",
      appointmentStatus: estCancelada,
      client: mariana,
    },
    {
      fecha: en(1), hora: "15:00:00",
      observacion: "Primera valoración para un proyecto de decoración de sala.",
      appointmentStatus: estPendiente,
      client: juanPablo,
    },
    {
      fecha: en(3), hora: "17:00:00",
      observacion: "Entrega y pago final del marco dorado para el diploma.",
      appointmentStatus: estConfirmada,
      client: mariana,
    },
  ]));

  // ── Ventas + Pedidos (detalle_venta) + Pagos ────────────────────────────
  console.log("Creando ventas, pedidos y pagos...");

  // Venta 1 — Mariana, restauración de un óleo familiar. Plan de 2 abonos,
  // primer abono ya pagado, en preparación.
  const venta1 = await ventaRepo.save(ventaRepo.create({
    fecha: hace(20), total: 420000, estado: true, client: mariana,
    num_abonos: 2, porcentaje_primer_abono: 70,
  }));
  const detalle1 = await detalleRepo.save(detalleRepo.create({
    fecha: hace(20), precio: 420000, estado: true,
    observacion: "Óleo sobre lienzo, retrato familiar de los años 60. Desprendimiento de pintura en la esquina inferior derecha.",
    sale: venta1, service: restauracion, serviceStatus: servEnPreparacion,
  }));
  await historialRepo.save(historialRepo.create([
    { saleDetail: detalle1, serviceStatus: servSinEmpezar,   fecha: hace(20) },
    { saleDetail: detalle1, serviceStatus: servEnPreparacion, fecha: hace(12) },
  ]));
  const plan1 = calculateInstallments(420000, 2, 70);
  await pagoRepo.save(pagoRepo.create({
    fecha: hace(20), monto: plan1[0].amount, observacion: "Abono inicial en efectivo.",
    sale: venta1, paymentMethod: metodoEfectivo, paymentStatus: estadoValidado,
  }));

  // Venta 2 — Mariana, enmarcación de un diploma con marco dorado. Pago
  // único, ya entregado y totalmente pagada.
  const venta2 = await ventaRepo.save(ventaRepo.create({
    fecha: hace(10), total: 128000, estado: true, client: mariana,
    num_abonos: 1, porcentaje_primer_abono: 100,
  }));
  const detalle2 = await detalleRepo.save(detalleRepo.create({
    fecha: hace(10), precio: 128000, estado: true,
    observacion: "Diploma de grado universitario, tamaño carta, con paspartú color hueso.",
    sale: venta2, service: enmarcacion, serviceStatus: servFinalizado, frame: marcoParaEnmarcacion,
  }));
  await historialRepo.save(historialRepo.create([
    { saleDetail: detalle2, serviceStatus: servSinEmpezar,    fecha: hace(10) },
    { saleDetail: detalle2, serviceStatus: servEnPreparacion, fecha: hace(8) },
    { saleDetail: detalle2, serviceStatus: servFinalizado,    fecha: hace(4) },
  ]));
  await pagoRepo.save(pagoRepo.create({
    fecha: hace(10), monto: 128000, observacion: "Pago completo por transferencia.",
    sale: venta2, paymentMethod: metodoTransferencia, paymentStatus: estadoValidado,
  }));

  // Venta 3 — Juan Pablo, personalización de un mueble + asesoría de
  // decoración en la misma venta. Plan de 3 abonos, primero ya pagado,
  // ambos pedidos recién iniciando.
  const venta3 = await ventaRepo.save(ventaRepo.create({
    fecha: hace(15), total: 610000, estado: true, client: juanPablo,
    num_abonos: 3, porcentaje_primer_abono: 50,
  }));
  const detalle3a = await detalleRepo.save(detalleRepo.create({
    fecha: hace(15), precio: 350000, estado: true,
    observacion: "Personalización de un mueble bar con vinilos y acabados a mano.",
    sale: venta3, service: personalizacion, serviceStatus: servSinEmpezar,
  }));
  const detalle3b = await detalleRepo.save(detalleRepo.create({
    fecha: hace(15), precio: 260000, estado: true,
    observacion: "Asesoría de decoración para la sala principal del apartamento.",
    sale: venta3, service: decoracion, serviceStatus: servSinEmpezar,
  }));
  await historialRepo.save(historialRepo.create([
    { saleDetail: detalle3a, serviceStatus: servSinEmpezar, fecha: hace(15) },
    { saleDetail: detalle3b, serviceStatus: servSinEmpezar, fecha: hace(15) },
  ]));
  const plan3 = calculateInstallments(610000, 3, 50);
  await pagoRepo.save(pagoRepo.create({
    fecha: hace(15), monto: plan3[0].amount, observacion: "Primer abono en efectivo.",
    sale: venta3, paymentMethod: metodoEfectivo, paymentStatus: estadoValidado,
  }));

  // Venta 4 — Juan Pablo, texturizado, creada desde la cita completada hace
  // 6 días (demuestra el flujo Cita -> Venta). Aún sin abonos registrados.
  const venta4 = await ventaRepo.save(ventaRepo.create({
    fecha: hace(6), total: 250000, estado: true, client: juanPablo,
    num_abonos: 2, porcentaje_primer_abono: 70,
    appointment: citaCompletadaJuanPablo,
  }));
  const detalle4 = await detalleRepo.save(detalleRepo.create({
    fecha: hace(6), precio: 250000, estado: true,
    observacion: "Texturizado de un cuadro de gran formato, técnica mixta con relieve.",
    sale: venta4, service: texturizado, serviceStatus: servSinEmpezar,
  }));
  await historialRepo.save(historialRepo.create({
    saleDetail: detalle4, serviceStatus: servSinEmpezar, fecha: hace(6),
  }));

  console.log("✅  Datos de demo creados:");
  console.log("   3 usuarios internos (clave para todos: Demo1234!)");
  console.log("   2 clientes (con cuenta de portal, misma clave)");
  console.log("   5 citas en distintos estados");
  console.log("   4 ventas / 5 pedidos (uno por cada tipo de servicio) / 3 pagos");
  console.log(`   Marcos nuevos: ${marco30.codigo}, ${marco45.codigo}`);

  await AppDataSource.destroy();
}

main().catch(err => {
  console.error("❌  Error sembrando datos de demo:", err);
  process.exit(1);
});
