// src/helpers/legalAcceptance.helper.ts
// Fuente única para insertar las filas de aceptación legal — ADR-007 §6:
// "El registro de aceptación es atómico con el alta del cliente" y "Un
// registro produce dos filas, una por cada tipo_documento. No consolidar."
import { EntityManager } from "typeorm";
import { Client } from "../models/Client";
import { LegalAcceptance, TipoDocumentoLegal, EventoLegal, ContextoAceptacion } from "../models/LegalAcceptance";
import { DOCUMENTOS_LEGALES } from "../legal";

export interface InsertarAceptacionesParams {
  id_cliente:        number;
  documento_titular:  string;
  correo_titular:     string;
  contexto:           ContextoAceptacion;
  ip?:                string | null;
  user_agent?:        string | null;
}

// Inserta la aceptación de AMBOS documentos (ToS + PyP) dentro de la MISMA
// transacción que crea el Cliente — pasar siempre el EntityManager de esa
// transacción, nunca AppDataSource.manager directamente. Un cliente sin
// estas dos filas es un estado inválido del sistema (ADR-007 §6).
export async function insertarAceptacionesLegales(
  manager: EntityManager,
  params: InsertarAceptacionesParams,
): Promise<void> {
  const repo = manager.getRepository(LegalAcceptance);

  for (const tipo of [TipoDocumentoLegal.POLITICA_PRIVACIDAD, TipoDocumentoLegal.TERMINOS_SERVICIO]) {
    const documento = DOCUMENTOS_LEGALES[tipo];
    if (!documento) {
      // Falla dura a propósito (ADR-007 §6: "Los fallos de inserción no se
      // degradan silenciosamente") — mejor romper el registro que dejar un
      // cliente sin constancia de aceptación de un documento que no existe.
      throw new Error(`Documento legal ${tipo} no está disponible en DOCUMENTOS_LEGALES`);
    }

    const fila = repo.create({
      client:             { id_cliente: params.id_cliente } as Client,
      documento_titular:  params.documento_titular,
      correo_titular:     params.correo_titular,
      tipo_documento:     tipo,
      version:            documento.version,
      hash_documento:     documento.hash,
      evento:             EventoLegal.ACEPTACION,
      contexto:           params.contexto,
      ip:                 params.ip ?? null,
      user_agent:         params.user_agent ?? null,
    });
    await repo.save(fila);
  }
}
