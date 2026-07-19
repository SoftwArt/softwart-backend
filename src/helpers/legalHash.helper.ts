// src/helpers/legalHash.helper.ts
// Hash del contenido legal — ADR-007 §3.5 y §6: "El hash se calcula sobre el
// texto renderizado, mediante serialización canónica del documento, y se
// precalcula al arranque del servidor. No hashear el archivo fuente ni
// recalcular por petición."
import crypto from "crypto";

export interface LegalSeccion {
  titulo: string;
  parrafos: string[];
}

// JSON.stringify sobre la estructura (no un join de strings) es la
// serialización canónica: captura la forma exacta del contenido sin
// ambigüedad por separadores, y es estable mientras no cambie el orden de
// declaración de los campos en LegalSeccion.
export function hashDocumentoLegal(secciones: LegalSeccion[]): string {
  const canonico = JSON.stringify(secciones);
  return crypto.createHash("sha256").update(canonico, "utf8").digest("hex");
}
