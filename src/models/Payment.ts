import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PaymentStatus } from "./PaymentStatus";
import { PaymentMethod } from "./PaymentMethod";
import { Sale } from "./Sale";

@Entity("pago")
export class Payment {

  @PrimaryGeneratedColumn()
  id_pago!: number;

  @Column({ type: "date" })
  fecha!: Date;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  monto!: number;

  @Column({ nullable: true })
  observacion?: string;

  @ManyToOne(() => Sale, (x) => x.payments)
  @JoinColumn({ name: "id_venta" })
  sale!: Sale;

  @ManyToOne(() => PaymentMethod, (x) => x.payments)
  @JoinColumn({ name: "id_metodo_pago" })
  paymentMethod!: PaymentMethod;

  @ManyToOne(() => PaymentStatus, (x) => x.payments)
  @JoinColumn({ name: "id_estado_pago" })
  paymentStatus!: PaymentStatus;

}
