// Guard "inverso": ciertos estados no-terminales solo permiten avanzar hacia
// un único estado siguiente (normalmente "anular/cancelar"), nunca retroceder
// ni saltar a otro estado no-terminal — retroceder corrompería el registro
// histórico de algo que ya ocurrió (una cita ya completada, un servicio ya
// entregado). El estado terminal en sí (Cancelada/Cancelado) ya se bloquea
// aparte en cada controller — este helper cubre el paso previo.
export function transicionUnicaPermitida(opts: {
  estadoActualNombre:      string;
  estadoNuevoNombre:       string;
  claveEstadoActual:       string; // ej. "completada" — minúsculas, para .includes()
  claveEstadoPermitido:    string; // ej. "cancelada"
  etiquetaEstadoPermitido: string; // ej. "Cancelada" — para el mensaje al usuario
}): string | null {
  const { estadoActualNombre, estadoNuevoNombre, claveEstadoActual, claveEstadoPermitido, etiquetaEstadoPermitido } = opts;
  const actual = estadoActualNombre.toLowerCase();
  const nuevo  = estadoNuevoNombre.toLowerCase();
  if (actual.includes(claveEstadoActual) && !nuevo.includes(claveEstadoPermitido)) {
    return `${estadoActualNombre} solo puede cambiar a ${etiquetaEstadoPermitido}, no a otro estado`;
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
