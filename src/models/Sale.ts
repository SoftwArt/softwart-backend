import {
  Column, Entity, JoinColumn, ManyToOne,
  OneToMany, OneToOne, PrimaryGeneratedColumn,
} from "typeorm";
import { Appointment } from "./Appointment";
import { Client }      from "./Client";
import { SaleDetail }  from "./SaleDetail";
import { Payment }     from "./Payment";

@Entity("venta")
export class Sale {

  @PrimaryGeneratedColumn()
  id_venta!: number;

  @Column({ type: "date" })
  fecha!: Date;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total!: number;

  @Column({ nullable: true })
  observacion?: string;

  @Column({ type: "boolean" })
  estado!: boolean;

  @Column({ type: "int", default: 2 })
  num_abonos!: number;

  @Column({ type: "int", default: 70 })
  porcentaje_primer_abono!: number;

  @OneToOne(() => Appointment, (x) => x.sale, { nullable: true })
  @JoinColumn({ name: "id_cita" })
  appointment?: Appointment;

  @ManyToOne(() => Client, (x) => x.sales)
  @JoinColumn({ name: "id_cliente" })
  client!: Client;

  @OneToMany(() => SaleDetail, (x) => x.sale)
  saleDetails!: SaleDetail[];

  @OneToMany(() => Payment, (x) => x.sale)
  payments!: Payment[];
}
