// src/controllers/DashboardController.ts
import { Request, Response } from 'express'
import { AppDataSource } from '../data-source'

async function q<T>(sql: string, params: unknown[], fallback: T): Promise<T> {
  try {
    const rows = await AppDataSource.query(sql, params)
    if (!rows || rows.length === 0) return fallback
    return rows[0] as T
  } catch (e) {
    console.error('[Dashboard query error]', e instanceof Error ? e.message : e)
    return fallback
  }
}

async function qAll<T>(sql: string, params: unknown[]): Promise<T[]> {
  try {
    return await AppDataSource.query(sql, params) ?? []
  } catch (e) {
    console.error('[Dashboard query error]', e instanceof Error ? e.message : e)
    return []
  }
}

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const ahora           = new Date()
    const hoy             = ahora.toISOString().slice(0, 10)
    const mesActual       = ahora.getMonth() + 1
    const anio            = ahora.getFullYear()
    const mesAnterior     = mesActual === 1 ? 12 : mesActual - 1
    const anioMesAnterior = mesActual === 1 ? anio - 1 : anio

    // ── KPIs ──────────────────────────────────────────────────────────────────

    const { total_mes_actual } = await q<{ total_mes_actual: number }>(
      `SELECT COALESCE(SUM(total), 0) AS total_mes_actual
       FROM venta
       WHERE EXTRACT(MONTH FROM fecha) = $1
         AND EXTRACT(YEAR  FROM fecha) = $2`,
      [mesActual, anio], { total_mes_actual: 0 }
    )

    const { total_mes_anterior } = await q<{ total_mes_anterior: number }>(
      `SELECT COALESCE(SUM(total), 0) AS total_mes_anterior
       FROM venta
       WHERE EXTRACT(MONTH FROM fecha) = $1
         AND EXTRACT(YEAR  FROM fecha) = $2`,
      [mesAnterior, anioMesAnterior], { total_mes_anterior: 0 }
    )

    const { ingresos_mes } = await q<{ ingresos_mes: number }>(
      `SELECT COALESCE(SUM(p.monto), 0) AS ingresos_mes
       FROM pago p
       JOIN estado_pago ep ON ep.id_estado_pago = p.id_estado_pago
       WHERE ep.nombre ILIKE '%valid%' OR ep.nombre ILIKE '%pagado%'
         AND EXTRACT(MONTH FROM p.fecha) = $1
         AND EXTRACT(YEAR  FROM p.fecha) = $2`,
      [mesActual, anio], { ingresos_mes: 0 }
    )

    const { pagos_pendientes } = await q<{ pagos_pendientes: number }>(
      `SELECT COALESCE(SUM(p.monto), 0) AS pagos_pendientes
       FROM pago p
       JOIN estado_pago ep ON ep.id_estado_pago = p.id_estado_pago
       WHERE ep.nombre ILIKE '%pendiente%'`,
      [], { pagos_pendientes: 0 }
    )

    const { citas_hoy } = await q<{ citas_hoy: number }>(
      `SELECT COUNT(*) AS citas_hoy
       FROM cita
       WHERE fecha::date = $1::date`,
      [hoy], { citas_hoy: 0 }
    )

    const { citas_pendientes } = await q<{ citas_pendientes: number }>(
      `SELECT COUNT(*) AS citas_pendientes
       FROM cita c
       JOIN estado_cita ec ON ec.id_estado_cita = c.id_estado_cita
       WHERE ec.nombre ILIKE '%pendiente%'
          OR ec.nombre ILIKE '%programad%'`,
      [], { citas_pendientes: 0 }
    )

    // FIX: FK es id_estado, no id_estado_servicio
    const { pedidos_sin_empezar } = await q<{ pedidos_sin_empezar: number }>(
      `SELECT COUNT(*) AS pedidos_sin_empezar
       FROM detalle_venta dv
       JOIN estado_servicio es ON es.id_estado = dv.id_estado
       WHERE es.nombre ILIKE '%sin empezar%'`,
      [], { pedidos_sin_empezar: 0 }
    )

    const { pedidos_en_preparacion } = await q<{ pedidos_en_preparacion: number }>(
      `SELECT COUNT(*) AS pedidos_en_preparacion
       FROM detalle_venta dv
       JOIN estado_servicio es ON es.id_estado = dv.id_estado
       WHERE es.nombre ILIKE '%preparac%'`,
      [], { pedidos_en_preparacion: 0 }
    )

    // ── Citas hoy — FK directa cita.id_cliente → cliente.id_cliente ──────────
    const citas_hoy_detalle = await qAll<{
      id_cita: number; hora: string; cliente_nombre: string; estado: string
    }>(
      `SELECT c.id_cita,
              c.hora,
              COALESCE(cl.nombre, 'Cliente #' || c.id_cliente) AS cliente_nombre,
              ec.nombre AS estado
       FROM cita c
       LEFT JOIN cliente cl   ON cl.id_cliente   = c.id_cliente
       JOIN  estado_cita ec   ON ec.id_estado_cita = c.id_estado_cita
       WHERE c.fecha::date = $1::date
       ORDER BY c.hora ASC`,
      [hoy]
    )

    // FIX: FK es id_estado, no id_estado_servicio
    const pedidos_por_estado = await qAll<{ estado: string; total: number }>(
      `SELECT es.nombre AS estado, CAST(COUNT(*) AS INTEGER) AS total
       FROM detalle_venta dv
       JOIN estado_servicio es ON es.id_estado = dv.id_estado
       GROUP BY es.nombre
       ORDER BY total DESC`,
      []
    )

    // ── Últimas 5 ventas — FK directa venta.id_cliente → cliente.id_cliente ──
    const ventas_recientes = await qAll<{
      id_venta: number; fecha: string; total: number; cliente_nombre: string
    }>(
      `SELECT v.id_venta,
              v.fecha,
              v.total,
              COALESCE(cl.nombre, 'Cliente #' || v.id_cliente) AS cliente_nombre
       FROM venta v
       LEFT JOIN cliente cl ON cl.id_cliente = v.id_cliente
       ORDER BY v.fecha DESC, v.id_venta DESC
       LIMIT 5`,
      []
    )

    const ventas_por_semana = await qAll<{ semana: string; total: number }>(
      `SELECT TO_CHAR(DATE_TRUNC('week', fecha), 'DD/MM') AS semana,
              COALESCE(SUM(total), 0) AS total
       FROM venta
       WHERE fecha >= NOW() - INTERVAL '8 weeks'
       GROUP BY DATE_TRUNC('week', fecha)
       ORDER BY DATE_TRUNC('week', fecha) ASC`,
      []
    )

    const metodos_pago = await qAll<{ metodo: string; total: number }>(
      `SELECT mp.nombre AS metodo, CAST(COUNT(*) AS INTEGER) AS total
       FROM pago p
       JOIN metodo_pago mp ON mp.id_metodo_pago = p.id_metodo_pago
       GROUP BY mp.nombre
       ORDER BY total DESC`,
      []
    )

    // ── Alertas ───────────────────────────────────────────────────────────────

    const { ventas_sin_pago } = await q<{ ventas_sin_pago: number }>(
      `SELECT COUNT(*) AS ventas_sin_pago
       FROM venta v
       WHERE estado = true
         AND NOT EXISTS (
           SELECT 1 FROM pago p WHERE p.id_venta = v.id_venta
         )`,
      [], { ventas_sin_pago: 0 }
    )

    // FIX: FK es id_estado, no id_estado_servicio
    const { pedidos_atrasados } = await q<{ pedidos_atrasados: number }>(
      `SELECT COUNT(*) AS pedidos_atrasados
       FROM detalle_venta dv
       JOIN estado_servicio es ON es.id_estado = dv.id_estado
       WHERE es.nombre ILIKE '%pendiente%'`,
      [], { pedidos_atrasados: 0 }
    )

    // Citas completadas sin venta asociada (venta.id_cita → cita.id_cita via OneToOne)
    const { citas_sin_venta } = await q<{ citas_sin_venta: number }>(
      `SELECT COUNT(*) AS citas_sin_venta
       FROM cita c
       JOIN estado_cita ec ON ec.id_estado_cita = c.id_estado_cita
       WHERE ec.nombre ILIKE '%complet%'
         AND NOT EXISTS (
           SELECT 1 FROM venta v WHERE v.id_cita = c.id_cita
         )`,
      [], { citas_sin_venta: 0 }
    )

    res.json({
      success: true,
      data: {
        kpis: {
          ventas_mes_actual:   Number(total_mes_actual),
          ventas_mes_anterior: Number(total_mes_anterior),
          ingresos_mes:        Number(ingresos_mes),
          pagos_pendientes:    Number(pagos_pendientes),
          citas_hoy:           Number(citas_hoy),
          citas_pendientes:    Number(citas_pendientes),
          pedidos_sin_empezar:   Number(pedidos_sin_empezar),
          pedidos_en_preparacion: Number(pedidos_en_preparacion),
        },
        citas_hoy:         citas_hoy_detalle,
        pedidos_por_estado,
        ventas_recientes,
        ventas_por_semana,
        metodos_pago,
        alertas: {
          ventas_sin_pago:   Number(ventas_sin_pago),
          pedidos_atrasados: Number(pedidos_atrasados),
          citas_sin_venta:   Number(citas_sin_venta),
        },
      },
    })
  } catch (error) {
    console.error('[DashboardController fatal]', error)
    res.status(500).json({ success: false, message: 'Error al obtener datos del dashboard', error })
  }
}