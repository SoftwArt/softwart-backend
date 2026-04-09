import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { SaleDetail } from "./SaleDetail";

@Entity("servicio")
export class Service {

  @PrimaryGeneratedColumn()
  id_servicio!: number;

  @Column()
  nombre!: string;

  @Column({ nullable: true })
  descripcion?: string;

  @Column()
  duracion!: number;

  @Column({ type: "boolean" })
  estado!: boolean;

  @OneToMany(() => SaleDetail, (x) => x.service)
  saleDetails!: SaleDetail[];

}
