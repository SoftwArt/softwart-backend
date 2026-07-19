// ─────────────────────────────────────────────────────────────────────────────
//  LegalController.ts
//  Endpoints públicos de solo lectura para los documentos legales (Política de
//  Privacidad, Términos de Servicio). El backend es la única fuente del
//  contenido — ver src/legal/index.ts — el frontend siempre consulta acá,
//  tanto para la página pública de lectura como para el modal de registro.
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { DOCUMENTOS_LEGALES } from "../legal";
import { TipoDocumentoLegal } from "../models/LegalAcceptance";

function getDocumento(tipo: TipoDocumentoLegal, req: Request, res: Response): void {
  const doc = DOCUMENTOS_LEGALES[tipo];
  if (!doc) {
    res.status(404).json({ success: false, message: "Documento aún no publicado" });
    return;
  }
  res.json({ success: true, data: doc });
}

export const getPoliticaPrivacidad = (req: Request, res: Response): void => {
  getDocumento(TipoDocumentoLegal.POLITICA_PRIVACIDAD, req, res);
};

export const getTerminosServicio = (req: Request, res: Response): void => {
  getDocumento(TipoDocumentoLegal.TERMINOS_SERVICIO, req, res);
};
