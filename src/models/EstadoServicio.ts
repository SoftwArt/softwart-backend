// Generado automáticamente por generate-models.js
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DetalleVenta } from "./DetalleVenta";

@Entity("estado_servicio")
export class EstadoServicio {

  @PrimaryGeneratedColumn()
  id_estado!: number;

  @Column()
  nombre!: string;

  @OneToMany(() => DetalleVenta, (x) => x.estadoServicio)
  detallesVenta!: DetalleVenta[];

}
