// src/legal/index.ts
// Punto único de acceso a los documentos legales — LegalController y el
// wiring de aceptación (register, la única vía de alta de Cliente con cuenta)
// deben importar desde acá, nunca leer politicaPrivacidad.ts directamente.
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
import {
  TERMINOS_SERVICIO_VERSION,
  TERMINOS_SERVICIO_FECHA,
  TERMINOS_SERVICIO_SECCIONES,
} from "./terminosServicio";

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

// ⚠️ terminosServicio.ts sigue en ESTADO: BORRADOR (varios [[PENDIENTE]] sin
// resolver con Silvana — ver PENDIENTES_TOS en ese archivo). Se conecta igual
// por decisión explícita para poder avanzar el wiring de aceptación; el hash
// que queda registrado en cada fila de aceptacion_legal seguirá siendo válido
// como prueba de "qué texto exacto se mostró", pero ese texto cambiará en
// cuanto se resuelvan los pendientes — la versión pasará de '1.0-BORRADOR' a
// '1.0' y se forzará re-aceptación (ADR-007, regla de versionado).
const terminosServicio: DocumentoLegal = {
  tipo:      TipoDocumentoLegal.TERMINOS_SERVICIO,
  version:   TERMINOS_SERVICIO_VERSION,
  fecha:     TERMINOS_SERVICIO_FECHA,
  hash:      hashDocumentoLegal(TERMINOS_SERVICIO_SECCIONES),
  secciones: TERMINOS_SERVICIO_SECCIONES,
};

export const DOCUMENTOS_LEGALES: Partial<Record<TipoDocumentoLegal, DocumentoLegal>> = {
  [TipoDocumentoLegal.POLITICA_PRIVACIDAD]: politicaPrivacidad,
  [TipoDocumentoLegal.TERMINOS_SERVICIO]:   terminosServicio,
};
