// Generado automáticamente por generate-models.js
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DetalleVenta } from "./DetalleVenta";

@Entity("servicio")
export class Servicio {

  @PrimaryGeneratedColumn()
  id_servicio!: number;

  @Column()
  nombre!: string;

  @Column({ nullable: true })
  descripcion?: string;

  @Column()
  duracion!: number;

  @Column({ type: "boolean" })
  estado!: boolean;

  @OneToMany(() => DetalleVenta, (x) => x.servicio)
  detallesVenta!: DetalleVenta[];

}
