import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Payment } from "./Payment";

@Entity("metodo_pago")
export class PaymentMethod {

  @PrimaryGeneratedColumn()
  id_metodo_pago!: number;

  @Column()
  nombre!: string;

  @OneToMany(() => Payment, (x) => x.paymentMethod)
  payments!: Payment[];

}
