// Generado automáticamente por generate-models.js
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Pago } from "./Pago";

@Entity("metodo_pago")
export class MetodoPago {

  @PrimaryGeneratedColumn()
  id_metodo_pago!: number;

  @Column()
  nombre!: string;

  @OneToMany(() => Pago, (x) => x.metodoPago)
  pagos!: Pago[];

}
