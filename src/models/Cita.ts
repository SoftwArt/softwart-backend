// Generado automáticamente por generate-models.js
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Cliente } from "./Cliente";
import { EstadoCita } from "./EstadoCita";
import { Venta } from "./Venta";

@Entity("cita")
export class Cita {

  @PrimaryGeneratedColumn()
  id_cita!: number;

  @Column({ type: "date" })
  fecha!: Date;

  @Column({ type: "time" })
  hora!: string;

  @Column({ nullable: true })
  observacion?: string;

  @ManyToOne(() => EstadoCita, (x) => x.citas)
  @JoinColumn({ name: "id_estado_cita" })
  estadoCita!: EstadoCita;

  @ManyToOne(() => Cliente, (x) => x.citas)
  @JoinColumn({ name: "id_cliente" })
  cliente!: Cliente;

  @OneToOne(() => Venta, (x) => x.cita)
  venta?: Venta;

}
