// src/legal/index.ts
// Punto único de acceso a los documentos legales — LegalController y el
// wiring de aceptación (register / createClient con crearAccesoPortal) deben
// importar desde acá, nunca leer politicaPrivacidad.ts directamente.
//
// El hash se calcula al importarse este módulo por primera vez (Node cachea
// el módulo, así que solo corre una vez por proceso — "al arranque del
// servidor", conforme al ADR-007 §6). No se recalcula por request.
import { TipoDocumentoLegal } from "../models/LegalAcceptance";
import { hashDocumentoLegal, LegalSeccion } from "../helpers/legalHash.helper";
import {
  POLITICA_PRIVACIDAD_VERSION,
  POLITICA_PRIVACIDAD_FECHA,
  POLITICA_PRIVACIDAD_SECCIONES,
} from "./politicaPrivacidad";

export interface DocumentoLegal {
  tipo:     TipoDocumentoLegal;
  version:  string;
  fecha:    string;
  hash:     string;
  secciones: LegalSeccion[];
}

const politicaPrivacidad: DocumentoLegal = {
  tipo:      TipoDocumentoLegal.POLITICA_PRIVACIDAD,
  version:   POLITICA_PRIVACIDAD_VERSION,
  fecha:     POLITICA_PRIVACIDAD_FECHA,
  hash:      hashDocumentoLegal(POLITICA_PRIVACIDAD_SECCIONES),
  secciones: POLITICA_PRIVACIDAD_SECCIONES,
};

// TERMINOS_SERVICIO se agrega aquí cuando se redacte (ver ADR-007 §6: "Un
// registro produce dos filas, una por cada tipo_documento" — el wiring de
// aceptación en register/createClient no puede completarse hasta que exista).
export const DOCUMENTOS_LEGALES: Partial<Record<TipoDocumentoLegal, DocumentoLegal>> = {
  [TipoDocumentoLegal.POLITICA_PRIVACIDAD]: politicaPrivacidad,
};
