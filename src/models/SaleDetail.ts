import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ServiceStatus } from "./ServiceStatus";
import { Frame } from "./Frame";
import { Service } from "./Service";
import { Sale } from "./Sale";

@Entity("detalle_venta")
export class SaleDetail {

  @PrimaryGeneratedColumn()
  id_detalle!: number;

  @Column({ type: "date" })
  fecha!: Date;

  @Column({ nullable: true })
  observacion?: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  precio!: number;

  @Column({ type: "boolean" })
  estado!: boolean;

  @ManyToOne(() => Sale, (x) => x.saleDetails)
  @JoinColumn({ name: "id_venta" })
  sale!: Sale;

  @ManyToOne(() => Service, (x) => x.saleDetails)
  @JoinColumn({ name: "id_servicio" })
  service!: Service;

  @ManyToOne(() => ServiceStatus, (x) => x.saleDetails)
  @JoinColumn({ name: "id_estado" })
  serviceStatus!: ServiceStatus;

  @ManyToOne(() => Frame, (x) => x.saleDetails, { nullable: true })
  @JoinColumn({ name: "id_marco"})
  frame?: Frame;

}
