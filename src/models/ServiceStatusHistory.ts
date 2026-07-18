import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { SaleDetail } from "./SaleDetail";
import { ServiceStatus } from "./ServiceStatus";

// Log de auditoría: una fila por cada cambio de id_estado que sufre un
// SaleDetail — a diferencia de SaleDetail.serviceStatus (que solo guarda el
// estado ACTUAL), esta tabla conserva la secuencia completa para poder armar
// el historial de avance del servicio ("Sin empezar" → "En preparación" →
// "Finalizado", con la fecha de cada salto).
@Entity("historial_estado_servicio")
export class ServiceStatusHistory {

  @PrimaryGeneratedColumn()
  id_historial!: number;

  @ManyToOne(() => SaleDetail, { onDelete: "CASCADE" })
  @JoinColumn({ name: "id_detalle" })
  saleDetail!: SaleDetail;

  @ManyToOne(() => ServiceStatus)
  @JoinColumn({ name: "id_estado" })
  serviceStatus!: ServiceStatus;

  @CreateDateColumn({ type: "timestamp" })
  fecha!: Date;

}
