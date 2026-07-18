// src/helpers/serviceStatusHistory.helper.ts
import { EntityManager } from "typeorm";
import { ServiceStatusHistory } from "../models/ServiceStatusHistory";
import { SaleDetail } from "../models/SaleDetail";
import { ServiceStatus } from "../models/ServiceStatus";

// Registra una fila de historial cada vez que un SaleDetail cambia de
// serviceStatus (incluida su asignación inicial al crearse). Usa el manager
// recibido para que participe de la misma transacción que el cambio de
// estado que lo origina.
export async function logServiceStatusChange(
  manager: EntityManager,
  saleDetail: Pick<SaleDetail, "id_detalle">,
  serviceStatus: ServiceStatus,
): Promise<void> {
  const entry = manager.create(ServiceStatusHistory, {
    saleDetail: { id_detalle: saleDetail.id_detalle } as SaleDetail,
    serviceStatus,
  });
  await manager.save(entry);
}
