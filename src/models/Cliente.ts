// Generado automáticamente por generate-models.js
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Cita } from "./Cita";
import { Venta } from "./Venta";

@Entity("cliente")
export class Cliente {

  @PrimaryGeneratedColumn()
  id_cliente!: number;

  @Column()
  tipoDocumento!: string;

  @Column({ unique: true })
  documento!: string;

  @Column()
  nombre!: string;

  @Column({ unique: true })
  correo!: string;

  @Column()
  telefono?: string;

  @Column({ type: "boolean" })
  estado!: boolean;

  @OneToMany(() => Cita, (x) => x.cliente)
  citas!: Cita[];

  @OneToMany(() => Venta, (x) => x.cliente)
  ventas!: Venta[];

}
