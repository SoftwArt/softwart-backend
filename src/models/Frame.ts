import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { SaleDetail } from "./SaleDetail";

@Entity("marco")
export class Frame {

  @PrimaryGeneratedColumn()
  id_marco!: number;

  @Column({ unique: true })
  codigo!: string;

  // Ancho de la colilla en mm — se suma a (largo + ancho) × 2 en la fórmula
  // de la calculadora (CalculatorPage), nunca fue un dato textual.
  @Column({ type: "int" })
  colilla!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  precio_ensamblado!: number;

  @Column({ type: "boolean" })
  estado!: boolean;

  @OneToMany(() => SaleDetail, (x) => x.frame)
  saleDetails!: SaleDetail[];

}
