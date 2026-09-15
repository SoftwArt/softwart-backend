import { bogotaCitaMs, bogotaNowMs } from "./bogotaTime.helper";
import { toFechaStr } from "./dateCascade.helper";

// Guard "inverso": ciertos estados no-terminales solo permiten avanzar hacia
// un único estado siguiente (normalmente "anular/cancelar"), nunca retroceder
// ni saltar a otro estado no-terminal — retroceder corrompería el registro
// histórico de algo que ya ocurrió (una cita ya completada, un servicio ya
// entregado). El estado terminal en sí (Cancelada/Cancelado) ya se bloquea
// aparte en cada controller — este helper cubre el paso previo.
export function transicionUnicaPermitida(opts: {
  estadoActualNombre:      string;
  estadoNuevoNombre:       string;
  claveEstadoActual:       string;   // ej. "completada" — minúsculas, para .includes()
  claveEstadoPermitido:    string | string[]; // ej. "cancelada", o ["cancelado", "entregado"] si hay más de un destino válido
  etiquetaEstadoPermitido: string | string[]; // ej. "Cancelada" — para el mensaje al usuario (mismo orden que claveEstadoPermitido)
}): string | null {
  const { estadoActualNombre, estadoNuevoNombre, claveEstadoActual, claveEstadoPermitido, etiquetaEstadoPermitido } = opts;
  const actual = estadoActualNombre.toLowerCase();
  const nuevo  = estadoNuevoNombre.toLowerCase();
  const claves    = Array.isArray(claveEstadoPermitido)    ? claveEstadoPermitido    : [claveEstadoPermitido];
  const etiquetas = Array.isArray(etiquetaEstadoPermitido) ? etiquetaEstadoPermitido : [etiquetaEstadoPermitido];
  if (actual.includes(claveEstadoActual) && !claves.some((c) => nuevo.includes(c))) {
    return `${estadoActualNombre} solo puede cambiar a ${etiquetas.join(" o ")}, no a otro estado`;
  }
  return null;
}

// Guard de estado terminal: una vez en Cancelada/Cancelado/Anulado, el
// registro no admite ningún cambio más (ni de estado ni de sus demás campos)
// — se conserva por trazabilidad, no se "reabre". Antes cada controller
// redactaba este mensaje a su manera ("no puede modificarse", "no puede
// cambiar el estado", con o sin mención al estado en sí); esta plantilla lo
// deja consistente en los 6 sitios que lo repiten (Cita, DetalleVenta, Pago).
export function guardEstadoTerminal(opts: {
  estadoActualNombre: string;
  claveTerminal:      string; // ej. "cancelada" — minúsculas, para .includes()
  etiquetaEntidad:    string; // ej. "cita" — sustantivo en minúsculas
  genero:             "f" | "m";
  etiquetaEstado:     string; // ej. "Cancelada" — para el mensaje al usuario
  alternativa?:       string; // opcional — qué hacer en su lugar (ej. "Registra un abono nuevo.")
}): string | null {
  const { estadoActualNombre, claveTerminal, etiquetaEntidad, genero, etiquetaEstado, alternativa } = opts;
  if (!estadoActualNombre.toLowerCase().includes(claveTerminal)) return null;
  const demostrativo = genero === "f" ? "esta" : "este";
  const base = `No se puede modificar: ${demostrativo} ${etiquetaEntidad} ya está ${etiquetaEstado}`;
  return alternativa ? `${base}. ${alternativa}` : base;
}

// Guard manual (staff) para "No Asistió": solo tiene sentido marcar que el
// cliente no llegó DESPUÉS de que la cita en sí ya ocurrió — antes de esa
// hora es una suposición, no un hecho. Distinto del margen de +3h que usa el
// job automático markNoShowIfOverdue (ese es un criterio de limpieza con
// cortesía; este es sobre la acción manual del staff, sin margen).
export function assertNoAsistioSoloSiYaOcurrio(opts: {
  estadoNuevoNombre: string;
  fecha: Date | string; // columna @Column({ type: "date" }) — TypeORM la tipa Date, runtime es string
  hora:  string;         // HH:MM(:SS)
}): string | null {
  const { estadoNuevoNombre, hora } = opts;
  const fecha = toFechaStr(opts.fecha);
  if (!estadoNuevoNombre.toLowerCase().includes("no asisti")) return null;
  if (bogotaCitaMs(fecha, hora) > bogotaNowMs()) {
    return "No se puede marcar \"No Asistió\" antes de la fecha y hora de la cita.";
  }
  return null;
}
