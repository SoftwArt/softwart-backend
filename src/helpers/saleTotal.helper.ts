import { Repository } from "typeorm";
import { SaleDetail } from "../models/SaleDetail";

// Sale.total y SaleDetail.precio son `decimal(10,2)` — TypeORM los devuelve
// como string salvo transformer explícito (no hay uno acá), así que toda
// comparación pasa por Number(...) + redondeo a centavos para no fallar por
// error de punto flotante (0.1 + 0.2 !== 0.3).
export function coincideConCentavos(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

// Suma de TODOS los SaleDetail de una Venta — incluye líneas Canceladas: su
// precio sí formó parte del total original facturado, cancelar un servicio
// después no reescribe la historia de lo que se cobró.
export async function sumaServiciosVenta(
  saleDetailRepo: Repository<SaleDetail>,
  id_venta: number,
  excluirIdDetalle?: number,
): Promise<number> {
  const qb = saleDetailRepo
    .createQueryBuilder("d")
    .select("COALESCE(SUM(d.precio), 0)", "sum")
    .where("d.id_venta = :id_venta", { id_venta });
  if (excluirIdDetalle !== undefined) {
    qb.andWhere("d.id_detalle != :excluirIdDetalle", { excluirIdDetalle });
  }
  const raw = await qb.getRawOne<{ sum: string }>();
  return Number(raw?.sum ?? 0);
}

export const msgTotalNoCoincide = (id_venta: number, total: number, suma: number) =>
  `El total de la Venta #${id_venta} (${total.toFixed(2)}) no coincidiría con la suma de sus servicios (${suma.toFixed(2)})`;
