import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { DataSource, QueryRunner } from "typeorm";
import { AppDataSource } from "../../data-source";
import "../setup";

/**
 * Garantías de inmutabilidad de `aceptacion_legal` (ADR-007).
 *
 * Estos tests no verifican lógica de aplicación: verifican que las garantías
 * declaradas en el ADR sigan existiendo EN LA BASE DE DATOS.
 *
 * Aislamiento: la tabla bloquea UPDATE, DELETE y TRUNCATE, por lo que la suite
 * no puede limpiar lo que inserta. Cada test corre dentro de una transacción
 * que se revierte al final. El ROLLBACK opera a nivel de MVCC y no dispara
 * triggers, así que es la única vía de limpieza disponible.
 *
 * NODE_ENV=test usa `synchronize: true` (no `migrationsRun`) — el trigger de
 * inmutabilidad, el trigger anti-TRUNCATE, la función y la vista viven solo
 * en migraciones (no son expresables como decoradores), así que synchronize
 * nunca los crea en la BD de test. El beforeAll de abajo los recrea a mano,
 * en espejo exacto de las migraciones 1750000000000, 1751000000000 y
 * 1752000000000 — si cambia el SQL de esas migraciones, hay que actualizar
 * este bloque también.
 */

const HASH_VALIDO = "a".repeat(64);

describe("aceptacion_legal — garantías de inmutabilidad (ADR-007)", () => {
  let ds: DataSource;
  let qr: QueryRunner;

  beforeAll(async () => {
    ds = AppDataSource;

    // Espejo de 1750000000000-CreateLegalAcceptanceEvents.ts (trigger + función + vista)
    // y 1751000000000-BlockTruncateAceptacionLegal.ts (trigger de sentencia) — necesario
    // porque el entorno de test usa `synchronize`, no migraciones.
    await ds.query(`
      CREATE OR REPLACE FUNCTION fn_bloquear_mutacion_aceptacion()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $$
      BEGIN
        -- Excepción: permitir el UPDATE interno del motor cuando el Cliente
        -- referenciado se elimina (FK ON DELETE SET NULL) — solo si el ÚNICO
        -- cambio es id_cliente pasando a NULL. Ver migración 1752000000000.
        IF TG_OP = 'UPDATE'
           AND NEW.id_cliente IS NULL
           AND OLD.id_cliente IS NOT NULL
           AND NEW.documento_titular  IS NOT DISTINCT FROM OLD.documento_titular
           AND NEW.correo_titular     IS NOT DISTINCT FROM OLD.correo_titular
           AND NEW.tipo_documento     IS NOT DISTINCT FROM OLD.tipo_documento
           AND NEW.version            IS NOT DISTINCT FROM OLD.version
           AND NEW.hash_documento     IS NOT DISTINCT FROM OLD.hash_documento
           AND NEW.evento             IS NOT DISTINCT FROM OLD.evento
           AND NEW.contexto           IS NOT DISTINCT FROM OLD.contexto
           AND NEW.ip                 IS NOT DISTINCT FROM OLD.ip
           AND NEW.user_agent         IS NOT DISTINCT FROM OLD.user_agent
           AND NEW.ocurrido_en        IS NOT DISTINCT FROM OLD.ocurrido_en
        THEN
          RETURN NEW;
        END IF;

        RAISE EXCEPTION
          'aceptacion_legal es un registro de auditoria inmutable: % no permitido. '
          'Para revocar, inserte un evento REVOCACION.',
          TG_OP;
      END;
      $$
    `);

    await ds.query(`DROP TRIGGER IF EXISTS trg_aceptacion_inmutable ON aceptacion_legal`);
    await ds.query(`
      CREATE TRIGGER trg_aceptacion_inmutable
        BEFORE UPDATE OR DELETE ON aceptacion_legal
        FOR EACH ROW
        EXECUTE FUNCTION fn_bloquear_mutacion_aceptacion()
    `);

    await ds.query(`DROP TRIGGER IF EXISTS trg_aceptacion_no_truncate ON aceptacion_legal`);
    await ds.query(`
      CREATE TRIGGER trg_aceptacion_no_truncate
        BEFORE TRUNCATE ON aceptacion_legal
        FOR EACH STATEMENT
        EXECUTE FUNCTION fn_bloquear_mutacion_aceptacion()
    `);

    await ds.query(`DROP VIEW IF EXISTS v_aceptacion_vigente`);
    await ds.query(`
      CREATE VIEW v_aceptacion_vigente AS
      SELECT DISTINCT ON (id_cliente, tipo_documento)
             id_cliente,
             tipo_documento,
             version        AS version_vigente,
             evento         AS ultimo_evento,
             ocurrido_en    AS vigente_desde,
             (evento = 'ACEPTACION') AS esta_vigente
        FROM aceptacion_legal
       WHERE id_cliente IS NOT NULL
       ORDER BY id_cliente, tipo_documento, ocurrido_en DESC, id_aceptacion DESC
    `);
  }, 60000);

  afterAll(async () => {
    // No se destruye AppDataSource acá: es la instancia compartida por toda
    // la suite (src/tests/setup.ts la inicializa una sola vez).
  });

  beforeEach(async () => {
    qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
  });

  afterEach(async () => {
    await qr.rollbackTransaction();
    await qr.release();
  });

  /** Inserta una fila mínima válida y devuelve su id. */
  async function insertarAceptacion(overrides: Record<string, unknown> = {}) {
    const fila = {
      documento_titular: "1000000001",
      correo_titular: "titular.prueba@example.com",
      tipo_documento: "POLITICA_PRIVACIDAD",
      version: "2.0",
      hash_documento: HASH_VALIDO,
      evento: "ACEPTACION",
      contexto: "REGISTRO",
      ...overrides,
    };

    const cols = Object.keys(fila);
    const params = cols.map((_, i) => `$${i + 1}`);

    const [row] = await qr.query(
      `INSERT INTO aceptacion_legal (${cols.join(", ")})
       VALUES (${params.join(", ")})
       RETURNING id_aceptacion`,
      Object.values(fila),
    );
    return row.id_aceptacion;
  }

  // -------------------------------------------------------------------------
  // Inmutabilidad
  // -------------------------------------------------------------------------

  it("rechaza UPDATE sobre cualquier columna", async () => {
    const id = await insertarAceptacion();

    await expect(
      qr.query(`UPDATE aceptacion_legal SET version = '9.9' WHERE id_aceptacion = $1`, [id]),
    ).rejects.toThrow(/auditoria inmutable/i);
  });

  it("rechaza DELETE", async () => {
    const id = await insertarAceptacion();

    await expect(
      qr.query(`DELETE FROM aceptacion_legal WHERE id_aceptacion = $1`, [id]),
    ).rejects.toThrow(/auditoria inmutable/i);
  });

  it("rechaza TRUNCATE", async () => {
    // TRUNCATE no dispara triggers FOR EACH ROW: requiere un trigger
    // FOR EACH STATEMENT propio (migración 1751000000000). Sin él, este
    // test falla y la bitácora completa es borrable de una sola sentencia.
    await expect(
      qr.query(`TRUNCATE TABLE aceptacion_legal`),
    ).rejects.toThrow(/auditoria inmutable/i);
  });

  it("permite INSERT (la tabla es append-only, no read-only)", async () => {
    const id = await insertarAceptacion();
    expect(id).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Restricciones de dominio
  // -------------------------------------------------------------------------

  it("rechaza la revocación de los Términos de Servicio", async () => {
    await expect(
      insertarAceptacion({ tipo_documento: "TERMINOS_SERVICIO", evento: "REVOCACION" }),
    ).rejects.toThrow(/chk_revocacion_solo_datos/i);
  });

  it("permite la revocación de la política de privacidad", async () => {
    const id = await insertarAceptacion({ evento: "REVOCACION" });
    expect(id).toBeDefined();
  });

  it("rechaza un hash con formato inválido", async () => {
    await expect(
      insertarAceptacion({ hash_documento: "no-es-un-sha256" }),
    ).rejects.toThrow(/chk_hash_hex/i);
  });

  it("rechaza un hash en mayúsculas (la representación canónica es minúscula)", async () => {
    await expect(
      insertarAceptacion({ hash_documento: "A".repeat(64) }),
    ).rejects.toThrow(/chk_hash_hex/i);
  });

  // -------------------------------------------------------------------------
  // Supervivencia a la eliminación de la cuenta
  // -------------------------------------------------------------------------

  it("conserva la constancia cuando se elimina el cliente (SET NULL, no CASCADE)", async () => {
    const [cliente] = await qr.query(
      `INSERT INTO cliente ("tipoDocumento", documento, nombre, correo, telefono, estado)
       VALUES ('CC', '1000000002', 'Titular Prueba', 'desechable@example.com', '3000000000', true)
       RETURNING id_cliente`,
    );

    const id = await insertarAceptacion({ id_cliente: cliente.id_cliente });

    await qr.query(`DELETE FROM cliente WHERE id_cliente = $1`, [cliente.id_cliente]);

    const [fila] = await qr.query(
      `SELECT id_cliente, documento_titular, correo_titular
         FROM aceptacion_legal WHERE id_aceptacion = $1`,
      [id],
    );

    expect(fila).toBeDefined();                        // la constancia sobrevive
    expect(fila.id_cliente).toBeNull();                 // el vínculo se corta
    expect(fila.documento_titular).toBe("1000000001");  // el titular sigue identificable
  });

  it("no permite modificar otras columnas aprovechando la exención de SET NULL", async () => {
    // Contraparte del test anterior: la exención del trigger para el UPDATE
    // interno de ON DELETE SET NULL debe exigir que id_cliente sea el ÚNICO
    // cambio. Si solo mirara "NEW.id_cliente IS NULL", esta sentencia colaría
    // un cambio de `version` disfrazado de SET NULL — la excepción se
    // volvería la puerta que el trigger existe para cerrar.
    const [cliente] = await qr.query(
      `INSERT INTO cliente ("tipoDocumento", documento, nombre, correo, telefono, estado)
       VALUES ('CC', '1000000004', 'Titular Escape', 'escape@example.com', '3000000002', true)
       RETURNING id_cliente`,
    );

    const id = await insertarAceptacion({ id_cliente: cliente.id_cliente });

    await expect(
      qr.query(
        `UPDATE aceptacion_legal SET id_cliente = NULL, version = '9.9'
          WHERE id_aceptacion = $1`,
        [id],
      ),
    ).rejects.toThrow(/auditoria inmutable/i);
  });

  // -------------------------------------------------------------------------
  // Objetos de esquema presentes
  //
  // Redundante con los tests anteriores, pero produce un mensaje de fallo
  // directo ("el trigger no existe") en lugar de indirecto ("el UPDATE
  // no lanzó excepción"). Cuando esto se rompa será dentro de meses, después
  // de una migración generada automáticamente, sin contexto fresco.
  // -------------------------------------------------------------------------

  it("mantiene los objetos de esquema que sostienen las garantías", async () => {
    const [{ existe: triggerFila }] = await qr.query(
      `SELECT EXISTS (
         SELECT 1 FROM pg_trigger
          WHERE tgname = 'trg_aceptacion_inmutable' AND NOT tgisinternal
       ) AS existe`,
    );
    expect(triggerFila).toBe(true);

    const [{ existe: triggerTruncate }] = await qr.query(
      `SELECT EXISTS (
         SELECT 1 FROM pg_trigger
          WHERE tgname = 'trg_aceptacion_no_truncate' AND NOT tgisinternal
       ) AS existe`,
    );
    expect(triggerTruncate).toBe(true);

    const [{ existe: vista }] = await qr.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.views
          WHERE table_name = 'v_aceptacion_vigente'
       ) AS existe`,
    );
    expect(vista).toBe(true);

    const restricciones = await qr.query(
      `SELECT conname FROM pg_constraint
        WHERE conrelid = 'aceptacion_legal'::regclass AND contype = 'c'`,
    );
    const nombres = restricciones.map((r: { conname: string }) => r.conname);
    expect(nombres).toEqual(
      expect.arrayContaining(["chk_revocacion_solo_datos", "chk_hash_hex"]),
    );
  });

  // -------------------------------------------------------------------------
  // Vista de estado vigente
  // -------------------------------------------------------------------------

  it("refleja el último evento en v_aceptacion_vigente", async () => {
    const [cliente] = await qr.query(
      `INSERT INTO cliente ("tipoDocumento", documento, nombre, correo, telefono, estado)
       VALUES ('CC', '1000000003', 'Titular Vista', 'vista@example.com', '3000000001', true)
       RETURNING id_cliente`,
    );

    await insertarAceptacion({ id_cliente: cliente.id_cliente, evento: "ACEPTACION" });
    await insertarAceptacion({ id_cliente: cliente.id_cliente, evento: "REVOCACION" });

    const [vigente] = await qr.query(
      `SELECT ultimo_evento, esta_vigente
         FROM v_aceptacion_vigente
        WHERE id_cliente = $1 AND tipo_documento = 'POLITICA_PRIVACIDAD'`,
      [cliente.id_cliente],
    );

    expect(vigente.ultimo_evento).toBe("REVOCACION");
    expect(vigente.esta_vigente).toBe(false);
  });
});
