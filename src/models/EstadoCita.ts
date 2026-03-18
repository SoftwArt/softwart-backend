// Generado automáticamente por generate-models.js
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Cita } from "./Cita";

@Entity("estado_cita")
export class EstadoCita {

  @PrimaryGeneratedColumn()
  id_estado_cita!: number;

  @Column()
  nombre!: string;

  @OneToMany(() => Cita, (x) => x.estadoCita)
  citas!: Cita[];

}
