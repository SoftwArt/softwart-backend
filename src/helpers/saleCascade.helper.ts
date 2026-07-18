// src/helpers/saleCascade.helper.ts
import { EntityManager } from "typeorm";
import { Sale } from "../models/Sale";
import { ServiceStatus } from "../models/ServiceStatus";
import { PaymentStatus } from "../models/PaymentStatus";

// Requiere sale.payments + sale.payments.paymentStatus cargados.
export function saleHasValidatedPayments(sale: Sale): boolean {
  return (sale.payments ?? []).some(
    (p) => p.paymentStatus?.nombre?.toLowerCase().includes("validado")
  );
}

export type VoidSaleCascadeResult = {
  serviciosCancelados: number;
  abonosAnulados: number;
};

// true si, excluyendo excludeDetailId, ningún otro SaleDetail de la venta queda
// "activo" (todos están Finalizado o Cancelado). Se usa para decidir si cancelar
// este servicio debe cascadear hacia arriba y anular también la Venta — cubre
// tanto el caso 1:1 (la venta solo tuvo este servicio) como el caso de varios
// servicios donde los demás ya estaban Finalizado/Cancelado.
// Requiere sale.saleDetails + serviceStatus cargados.
export function isLastActiveDetail(sale: Sale, excludeDetailId: number): boolean {
  return (sale.saleDetails ?? []).every((d) => {
    if (d.id_detalle === excludeDetailId) return true;
    const nombre = d.serviceStatus?.nombre?.toLowerCase() ?? "";
    return nombre.includes("finaliz") || nombre.includes("cancel");
  });
}

// Anula una Venta en cascada: cancela los SaleDetail no finalizados/cancelados
// y anula los Payment pendientes. El llamador es responsable de verificar
// saleHasValidatedPayments(sale) ANTES de llamar esto (dinero recibido → bloquea).
// Requiere sale.saleDetails + serviceStatus, sale.payments + paymentStatus cargados.
export async function voidSaleCascade(
  manager: EntityManager,
  sale: Sale,
): Promise<VoidSaleCascadeResult> {
  const estadoCancelado = await manager.getRepository(ServiceStatus).findOneBy({ nombre: "Cancelado" });
  const estadoAnulado   = await manager.getRepository(PaymentStatus).findOneBy({ nombre: "Anulado" });

  let serviciosCancelados = 0;
  let abonosAnulados = 0;

  sale.estado = false;
  await manager.save(sale);

  if (estadoCancelado) {
    for (const d of sale.saleDetails ?? []) {
      const nombre = d.serviceStatus?.nombre?.toLowerCase() ?? "";
      if (!nombre.includes("finaliz") && !nombre.includes("cancel")) {
        d.serviceStatus = estadoCancelado;
        await manager.save(d);
        serviciosCancelados++;
      }
    }
  }

  if (estadoAnulado) {
    for (const p of sale.payments ?? []) {
      if (p.paymentStatus?.nombre?.toLowerCase().includes("pendiente")) {
        p.paymentStatus = estadoAnulado;
        await manager.save(p);
        abonosAnulados++;
      }
    }
  }

  return { serviciosCancelados, abonosAnulados };
}
