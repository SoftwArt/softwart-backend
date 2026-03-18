// Generado automáticamente por generate-models.js
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { EstadoPago } from "./EstadoPago";
import { MetodoPago } from "./MetodoPago";
import { Venta } from "./Venta";

@Entity("pago")
export class Pago {

  @PrimaryGeneratedColumn()
  id_pago!: number;

  @Column({ type: "date" })
  fecha!: Date;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  monto!: number;

  @Column({ nullable: true })
  observacion?: string;

  @ManyToOne(() => Venta, (x) => x.pagos)
  @JoinColumn({ name: "id_venta" })
  venta!: Venta;

  @ManyToOne(() => MetodoPago, (x) => x.pagos)
  @JoinColumn({ name: "id_metodo_pago" })
  metodoPago!: MetodoPago;

  @ManyToOne(() => EstadoPago, (x) => x.pagos)
  @JoinColumn({ name: "id_estado_pago" })
  estadoPago!: EstadoPago;

}
