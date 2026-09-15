// src/helpers/searchExpr.helper.ts
// Fragmentos SQL reutilizables para que el ?q= de los buscadores admin
// entienda fecha en lenguaje natural y montos con separadores — mismo
// criterio que matchesFecha/matchesMonto (frontend, shared/lib/formatDate.ts
// y formatCurrency.ts), llevado a SQL porque la búsqueda ahora es
// server-side (antes se post-filtraba client-side sobre la lista completa).

// Quita tildes básicas (á/é/í/ó/ú/ñ) — espejo minimalista de stripAccents()
// del frontend, sin depender de \p{Diacritic} (evita normalizar dos veces:
// esto solo se usa para el valor del parámetro, no en SQL).
export function stripAccentsEs(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

// Compara una columna DATE/TIMESTAMP contra todas las representaciones
// "naturales" que un usuario podría escribir — ISO, DD/MM/YYYY, DD/MM,
// DD-MM, "D mon YYYY" y "día, D de mes de YYYY" — sin depender del locale
// del servidor Postgres (TO_CHAR con nombres de mes usa el locale del
// servidor, típicamente en inglés): arma los nombres en español a mano vía
// CASE sobre EXTRACT(MONTH/DOW). El texto generado va sin tildes (mismo
// criterio que stripAccentsEs) para poder compararlo contra un :qFecha ya
// normalizado sin tildes, sin importar cómo lo haya escrito el usuario.
// Requiere que el caller haga qb.setParameter("qFecha", `%${stripAccentsEs(q).toLowerCase()}%`)
// (o lo incluya en el objeto de params del primer .andWhere/.where).
export function fechaSearchExpr(col: string): string {
  // "sept" (no "sep") para septiembre — así es como lo abrevia
  // Intl/toLocaleDateString('es-CO', {month:'short'}) (el resto son de 3
  // letras), que es lo que formatDate() realmente muestra/busca en el
  // frontend — ver formatDate.ts.
  const mesCorto = `(CASE EXTRACT(MONTH FROM ${col})
    WHEN 1 THEN 'ene' WHEN 2 THEN 'feb' WHEN 3 THEN 'mar' WHEN 4 THEN 'abr'
    WHEN 5 THEN 'may' WHEN 6 THEN 'jun' WHEN 7 THEN 'jul' WHEN 8 THEN 'ago'
    WHEN 9 THEN 'sept' WHEN 10 THEN 'oct' WHEN 11 THEN 'nov' WHEN 12 THEN 'dic' END)`;
  const mesLargo = `(CASE EXTRACT(MONTH FROM ${col})
    WHEN 1 THEN 'enero' WHEN 2 THEN 'febrero' WHEN 3 THEN 'marzo' WHEN 4 THEN 'abril'
    WHEN 5 THEN 'mayo' WHEN 6 THEN 'junio' WHEN 7 THEN 'julio' WHEN 8 THEN 'agosto'
    WHEN 9 THEN 'septiembre' WHEN 10 THEN 'octubre' WHEN 11 THEN 'noviembre' WHEN 12 THEN 'diciembre' END)`;
  const diaSemana = `(CASE EXTRACT(DOW FROM ${col})
    WHEN 0 THEN 'domingo' WHEN 1 THEN 'lunes' WHEN 2 THEN 'martes' WHEN 3 THEN 'miercoles'
    WHEN 4 THEN 'jueves' WHEN 5 THEN 'viernes' WHEN 6 THEN 'sabado' END)`;
  const dd = `LPAD(EXTRACT(DAY FROM ${col})::text, 2, '0')`;
  const mm = `LPAD(EXTRACT(MONTH FROM ${col})::text, 2, '0')`;
  const yyyy = `EXTRACT(YEAR FROM ${col})::text`;
  const haystack = `(
    LOWER(${col}::text) || ' ' ||
    ${dd} || '/' || ${mm} || '/' || ${yyyy} || ' ' ||
    ${dd} || '/' || ${mm} || ' ' ||
    ${dd} || '-' || ${mm} || ' ' ||
    EXTRACT(DAY FROM ${col})::text || ' ' || ${mesCorto} || ' ' || ${yyyy} || ' ' ||
    ${diaSemana} || ', ' || EXTRACT(DAY FROM ${col})::text || ' de ' || ${mesLargo} || ' de ' || ${yyyy}
  )`;
  return `${haystack} ILIKE :qFecha`;
}

// Todas las palabras que fechaSearchExpr() puede llegar a generar (meses
// corto/largo, días de la semana) — para poder descartar de una la rama de
// fecha en una búsqueda de texto plano ("Sergio", "zsvpua") sin pagar el
// costo de EXTRACT/CASE/concatenar por cada fila. Ninguna de las
// representaciones de fecha soportadas (ISO, DD/MM/YYYY, "D mon YYYY", "día,
// D de mes de YYYY") puede matchear sin al menos un dígito o alguna de estas
// palabras, así que el chequeo es barato y no genera falsos negativos.
const PALABRAS_FECHA = [
  "ene", "enero", "feb", "febrero", "mar", "marzo", "abr", "abril",
  "may", "mayo", "jun", "junio", "jul", "julio", "ago", "agosto",
  "sept", "septiembre", "oct", "octubre", "nov", "noviembre", "dic", "diciembre",
  "domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado",
];

// true si la query podría describir una fecha (2+ dígitos, o contiene — o
// está contenida en, para cubrir mientras se sigue tipeando, ej. "septi"
// antes de terminar "septiembre" — alguna palabra de mes/día). Úsalo para
// agregar fechaSearchExpr() al OR solo cuando puede aportar algo, igual que
// ya se hace con montoSearchDigits() para la rama de monto.
//
// Un solo dígito queda afuera a propósito: el haystack de fechaSearchExpr()
// concatena año/mes/día en varios formatos, y CUALQUIER fila termina
// conteniendo casi cualquier dígito suelto en algún punto de esa cadena
// (ej. el año 2026 ya aporta los dígitos 2, 0 y 6) — un ?q= de un solo
// dígito activaba esta rama y hacía match con prácticamente toda la tabla,
// inflando meta.total con filas que no tenían nada que ver con lo buscado
// (detectado por list-search.test.ts: buscar el id de una venta de un solo
// dígito devolvía también otra venta distinta, solo por compartir año).
// A partir de 2 dígitos el riesgo de colisión así de amplia baja mucho y
// sigue cubriendo cualquier fecha real que alguien escriba (DD, DD/MM, año).
export function pareceFecha(q: string): boolean {
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 2) return true;
  const norm = stripAccentsEs(q).toLowerCase();
  return PALABRAS_FECHA.some((p) => norm.includes(p) || p.includes(norm));
}

// Dígitos puros de la query (misma lógica que matchesMonto del frontend),
// exigiendo 2+ para activar la rama — mismo criterio y misma razón que
// pareceFecha(): un solo dígito hace ILIKE '%d%' contra ROUND(total)::text,
// que con cualquier monto de varias cifras casi siempre contiene ese dígito
// en algún lado. null si no hay suficientes dígitos, para no agregar una
// rama que aportaría puro falso positivo.
export function montoSearchDigits(q: string): string | null {
  const digits = q.replace(/\D/g, "");
  return digits.length >= 2 ? digits : null;
}

// Compara una columna numeric/decimal (monto, precio, total) contra los
// dígitos puros de la query — así "150.268", "150,268" y "150268" matchean
// igual, sin importar el separador que haya usado quien busca.
export function montoSearchExpr(col: string): string {
  return `ROUND(${col})::text ILIKE :qMonto`;
}
