import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Client } from "./Client";

// Tabla transaccional: una fila por cada vez que un Cliente acepta los
// Términos de Servicio / Política de Privacidad — no se sobreescribe, se
// inserta una nueva fila (ej. al re-aceptar una versión nueva del documento),
// para conservar el historial completo como evidencia legal.
@Entity("aceptacion_legal")
export class LegalAcceptance {

  @PrimaryGeneratedColumn()
  id_aceptacion!: number;

  @ManyToOne(() => Client, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "id_cliente" })
  client!: Client;

  @Column({ type: "boolean" })
  aceptado!: boolean;

  @Column({ type: "varchar" })
  version_tos!: string;

  @Column({ type: "varchar" })
  version_pyp!: string;

  @CreateDateColumn({ type: "timestamp" })
  fecha!: Date;

}
