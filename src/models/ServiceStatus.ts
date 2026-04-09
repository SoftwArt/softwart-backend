import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { SaleDetail } from "./SaleDetail";

@Entity("estado_servicio")
export class ServiceStatus {

  @PrimaryGeneratedColumn()
  id_estado!: number;

  @Column()
  nombre!: string;

  @OneToMany(() => SaleDetail, (x) => x.serviceStatus)
  saleDetails!: SaleDetail[];

}
