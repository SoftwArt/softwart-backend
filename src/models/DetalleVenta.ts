// Generado automáticamente por generate-models.js
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { EstadoServicio } from "./EstadoServicio";
import { Marco } from "./Marco";
import { Servicio } from "./Servicio";
import { Venta } from "./Venta";

@Entity("detalle_venta")
export class DetalleVenta {

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

  @ManyToOne(() => Venta, (x) => x.detallesVenta)
  @JoinColumn({ name: "id_venta" })
  venta!: Venta;

  @ManyToOne(() => Servicio, (x) => x.detallesVenta)
  @JoinColumn({ name: "id_servicio" })
  servicio!: Servicio;

  @ManyToOne(() => EstadoServicio, (x) => x.detallesVenta)
  @JoinColumn({ name: "id_estado" })
  estadoServicio!: EstadoServicio;

  @ManyToOne(() => Marco, (x) => x.detallesVenta, { nullable: true })
  @JoinColumn({ name: "id_marco"})
  marco?: Marco;

}
