// src/helpers/dateCascade.helper.ts
// Validador "en cascada" del flujo Cita → Venta → Servicio/Pago (CLAUDE.md):
// cada entidad hija no puede fecharse antes que su padre en la cadena. No se
// compara Pago contra Servicio a propósito — el primer abono normalmente se
// cobra ANTES de que el servicio se complete (es un anticipo, no un pago
// posterior), así que esa comparación rechazaría el flujo normal del negocio.
//
// Las columnas `fecha` son `@Column({ type: "date" })`: TypeORM/pg las
// entrega en runtime como string "YYYY-MM-DD" a pesar de que el tipo TS dice
// `Date" — toFechaStr normaliza cualquiera de los dos casos.
function toFechaStr(fecha: Date | string): string {
  return typeof fecha === "string" ? fecha.slice(0, 10) : fecha.toISOString().slice(0, 10);
}

function sumarMeses(fechaStr: string, meses: number): string {
  const [y, m, d] = fechaStr.split("-").map(Number);
  const limite = new Date(y, m - 1, d);
  limite.setMonth(limite.getMonth() + meses);
  return `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}-${String(limite.getDate()).padStart(2, "0")}`;
}

// null = válido. mensaje = motivo del rechazo, listo para un 400.
export function assertFechaNoAntesDe(
  fecha: Date | string,
  minFecha: Date | string,
  etiqueta: string,
  etiquetaRef: string,
): string | null {
  const f = toFechaStr(fecha);
  const min = toFechaStr(minFecha);
  if (f < min) {
    return `La fecha de ${etiqueta} (${f}) no puede ser anterior a la fecha de ${etiquetaRef} (${min}).`;
  }
  return null;
}

export function assertFechaDentroDeVentana(
  fecha: Date | string,
  minFecha: Date | string,
  maxMeses: number,
  etiqueta: string,
  etiquetaRef: string,
): string | null {
  const f = toFechaStr(fecha);
  const min = toFechaStr(minFecha);
  if (f < min) {
    return `La fecha de ${etiqueta} (${f}) no puede ser anterior a la fecha de ${etiquetaRef} (${min}).`;
  }
  const max = sumarMeses(min, maxMeses);
  if (f > max) {
    return `La fecha de ${etiqueta} (${f}) no puede ser más de ${maxMeses} meses posterior a la fecha de ${etiquetaRef} (${min}).`;
  }
  return null;
}
