// src/helpers/bogotaTime.helper.ts
// cita.fecha/cita.hora siempre representan hora de pared de America/Bogota
// (UTC-5 fijo, sin horario de verano) — pero el proceso Node corre en UTC en
// Render. Cualquier cálculo de "ahora"/"hoy" que se compare contra esas
// columnas naive debe pasar por acá, no por `new Date()`/`NOW()` crudos.
//
// Convención para SQL crudo: cualquier `NOW()`/`CURRENT_DATE` que se compare
// contra `fecha`/`hora` debe envolverse como
// `(NOW() AT TIME ZONE 'America/Bogota')` — Postgres devuelve un timestamp
// naive ya desplazado a Bogotá, comparable directamente contra `fecha + hora`.
export const BOGOTA_TZ = "America/Bogota";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOGOTA_TZ,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hourCycle: "h23",
});

function bogotaParts(instant: Date): { y: number; mo: number; d: number; h: number; mi: number; s: number } {
  const parts = Object.fromEntries(partsFormatter.formatToParts(instant).map(p => [p.type, p.value]));
  return {
    y: Number(parts.year), mo: Number(parts.month), d: Number(parts.day),
    h: Number(parts.hour), mi: Number(parts.minute), s: Number(parts.second),
  };
}

// 'YYYY-MM-DD' — reemplaza cualquier `new Date().toISOString().slice(0, 10)`.
export function bogotaToday(): string {
  const { y, mo, d } = bogotaParts(new Date());
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Epoch ms real — para comparaciones de precisión horaria en JS.
export function bogotaNowMs(): number {
  const { y, mo, d, h, mi, s } = bogotaParts(new Date());
  // La hora de pared de Bogotá + 5h = el instante UTC equivalente.
  return Date.UTC(y, mo - 1, d, h + 5, mi, s);
}
