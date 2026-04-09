import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Payment } from "./Payment";

@Entity("estado_pago")
export class PaymentStatus {

  @PrimaryGeneratedColumn()
  id_estado_pago!: number;

  @Column()
  nombre!: string;

  @OneToMany(() => Payment, (x) => x.paymentStatus)
  payments!: Payment[];

}
