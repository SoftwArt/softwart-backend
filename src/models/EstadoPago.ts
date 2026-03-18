// Generado automáticamente por generate-models.js
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Pago } from "./Pago";

@Entity("estado_pago")
export class EstadoPago {

  @PrimaryGeneratedColumn()
  id_estado_pago!: number;

  @Column()
  nombre!: string;

  @OneToMany(() => Pago, (x) => x.estadoPago)
  pagos!: Pago[];

}
