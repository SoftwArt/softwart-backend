// Generado automáticamente por generate-models.js
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { DetalleVenta } from "./DetalleVenta";

@Entity("marco")
export class Marco {

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

  @OneToMany(() => DetalleVenta, (x) => x.marco)
  detallesVenta!: DetalleVenta[];

}
