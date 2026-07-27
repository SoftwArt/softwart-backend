import { MigrationInterface, QueryRunner } from "typeorm";

// guestAppointment (AuthController.ts, landing pública) creaba un Cliente
// nuevo sin dejar ninguna constancia de aceptación de habeas data — a
// diferencia de register, que sí inserta las 2 filas (ToS + PyP) en la misma
// transacción (ver ADR-007 §6). Se agrega un contexto propio en vez de
// reusar PORTAL (que implica sesión autenticada del cliente, no un
// formulario público sin cuenta).
export class AddCitaInvitadoContextoAceptacion1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE contexto_aceptacion ADD VALUE 'CITA_INVITADO'`);
  }

  public async down(): Promise<void> {
    // Postgres no soporta quitar un valor de un enum — no reversible.
    // Ver mismo criterio en RemoveEmpleadoRole1757000000000 (down no-op).
  }
}
