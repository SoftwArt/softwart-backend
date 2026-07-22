import { Response } from "express";

type Genero = "f" | "m";

interface AsociadosOpts {
  count: number;
  singular: string;
  plural: string;
  genero: Genero;
  alternativa?: string;
}

// Los guards de "no se puede eliminar por registros asociados" (12 sitios)
// repetían el mismo bug: "existen Cita asociados (1)" — ni concuerda en
// número/género, ni dice qué hacer en su lugar. Este helper centraliza la
// gramática (singular/plural + género) y deja la alternativa como texto
// libre porque cada entidad ofrece una distinta (desactivar, cancelar,
// reasignar...) — no todas tienen un toggle de estado.
export function mensajeNoEliminarAsociados({ count, singular, plural, genero, alternativa }: AsociadosOpts): string {
  const asociado  = genero === "f" ? "asociada"  : "asociado";
  const asociados = genero === "f" ? "asociadas" : "asociados";
  const cuerpo = count === 1
    ? `existe 1 ${singular} ${asociado}`
    : `existen ${count} ${plural} ${asociados}`;
  return `No se puede eliminar: ${cuerpo}.${alternativa ? ` ${alternativa}` : ""}`;
}

export function enviarNoEliminarAsociados(res: Response, opts: AsociadosOpts): void {
  res.status(409).json({ success: false, message: mensajeNoEliminarAsociados(opts) });
}
