import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Client } from "./Client";

export enum TipoDocumentoLegal {
  TERMINOS_SERVICIO = "TERMINOS_SERVICIO",
  POLITICA_PRIVACIDAD = "POLITICA_PRIVACIDAD",
}

export enum EventoLegal {
  ACEPTACION = "ACEPTACION",
  REVOCACION = "REVOCACION",
}

export enum ContextoAceptacion {
  REGISTRO = "REGISTRO",
  RE_ACEPTACION = "RE_ACEPTACION",
  PORTAL = "PORTAL",
}

// Registro de EVENTOS append-only, no de estado — ver ADR-007 (docs/ADR/).
// La inmutabilidad (bloqueo de UPDATE/DELETE vía trigger), el CHECK que
// impide revocar Términos de Servicio, y la vista v_aceptacion_vigente viven
// en la migración (1750000000000-CreateLegalAcceptanceEvents.ts) — no son
// expresables como decoradores de TypeORM. Nunca recrear esas reglas desde
// acá ni "simplificar" este modelo asumiendo que son redundantes.
//
// Los dos @Check() de abajo SÍ deben declararse aquí (a diferencia del
// trigger/vista): se comprobó que `synchronize: true` en dev BORRA
// silenciosamente cualquier CHECK constraint que exista en la BD pero no
// esté declarado en la entidad — sin esto, cada reinicio del servidor en
// dev iba dejando la tabla sin las restricciones que la migración creó.
@Entity("aceptacion_legal")
@Check("chk_revocacion_solo_datos", `evento <> 'REVOCACION' OR tipo_documento = 'POLITICA_PRIVACIDAD'`)
@Check("chk_hash_hex", `hash_documento ~ '^[0-9a-f]{64}$'`)
export class LegalAcceptance {

  @PrimaryGeneratedColumn({ type: "bigint" })
  id_aceptacion!: number;

  // Nullable a propósito: ON DELETE SET NULL en la BD — la constancia debe
  // sobrevivir a la eliminación del Cliente (política de privacidad §6).
  @Index("idx_aceptacion_cliente")
  @ManyToOne(() => Client, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "id_cliente" })
  client!: Client | null;

  // Copia desnormalizada al momento del evento — deliberada (ADR-007 §3.4).
  // No "normalizar" quitando estas columnas.
  @Index("idx_aceptacion_documento_titular")
  @Column({ type: "varchar", length: 20 })
  documento_titular!: string;

  @Column({ type: "varchar", length: 255 })
  correo_titular!: string;

  @Column({ type: "enum", enum: TipoDocumentoLegal, enumName: "tipo_documento_legal" })
  tipo_documento!: TipoDocumentoLegal;

  @Column({ type: "varchar", length: 10 })
  version!: string;

  // SHA-256 hex del texto exacto renderizado al titular — no solo la versión.
  @Column({ type: "char", length: 64 })
  hash_documento!: string;

  @Column({ type: "enum", enum: EventoLegal, enumName: "evento_legal" })
  evento!: EventoLegal;

  @Column({ type: "enum", enum: ContextoAceptacion, enumName: "contexto_aceptacion" })
  contexto!: ContextoAceptacion;

  @Column({ type: "inet", nullable: true })
  ip!: string | null;

  @Column({ type: "text", nullable: true })
  user_agent!: string | null;

  // TIMESTAMPTZ, no TIMESTAMP: excepción consciente al criterio naive del
  // ADR-002, acotada a este registro probatorio (ADR-007 §3.3).
  @Column({ type: "timestamptz", default: () => "now()" })
  ocurrido_en!: Date;

}
