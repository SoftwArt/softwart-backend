// src/models/Venta.ts
// CAMBIO: agregadas columnas num_abonos y porcentaje_primer_abono
import {
  Column, Entity, JoinColumn, ManyToOne,
  OneToMany, OneToOne, PrimaryGeneratedColumn,
} from "typeorm";
import { Cita }        from "./Cita";
import { Cliente }     from "./Cliente";
import { DetalleVenta} from "./DetalleVenta";
import { Pago }        from "./Pago";

@Entity("venta")
export class Venta {

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

  // ── Configuración de abonos ───────────────────────────────────────────────
  // Número total de abonos esperados (default: 2)
  @Column({ type: "int", default: 2 })
  num_abonos!: number;

  // Porcentaje del total que cubre el primer abono (default: 70)
  // Los abonos 2..N dividen el restante en partes iguales
  // El último abono siempre paga el saldo exacto
  @Column({ type: "int", default: 70 })
  porcentaje_primer_abono!: number;

  @OneToOne(() => Cita, (x) => x.venta, { nullable: true })
  @JoinColumn({ name: "id_cita" })
  cita?: Cita;

  @ManyToOne(() => Cliente, (x) => x.ventas)
  @JoinColumn({ name: "id_cliente" })
  cliente!: Cliente;

  @OneToMany(() => DetalleVenta, (x) => x.venta)
  detallesVenta!: DetalleVenta[];

  @OneToMany(() => Pago, (x) => x.venta)
  pagos!: Pago[];
}