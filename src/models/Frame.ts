import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { SaleDetail } from "./SaleDetail";

@Entity("marco")
export class Frame {

  @PrimaryGeneratedColumn()
  id_marco!: number;

  @Column({ unique: true })
  codigo!: string;

  @Column()
  colilla!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  precio_ensamblado!: number;

  @Column({ type: "boolean" })
  estado!: boolean;

  @OneToMany(() => SaleDetail, (x) => x.frame)
  saleDetails!: SaleDetail[];

}
