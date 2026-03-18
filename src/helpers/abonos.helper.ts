// src/helpers/abonos.helper.ts
// Calcula el monto esperado para cada abono según la configuración de la venta
// Exportado para usar en el controller y en tests

export type AbonoEsperado = {
  numero:   number   // 1-indexed
  monto:    number   // monto exacto esperado
  porcentaje: number // % del total (informativo)
}

/**
 * Calcula los montos esperados de cada abono
 * @param total             - Valor total de la venta
 * @param num_abonos        - Número de abonos configurados
 * @param porcentaje_primer - Porcentaje del total para el primer abono (0-100)
 */
export function calcularAbonos(
  total: number,
  num_abonos: number,
  porcentaje_primer: number
): AbonoEsperado[] {
  const t = Number(total)
  const n = Math.max(1, num_abonos)
  const p = Math.min(99, Math.max(1, porcentaje_primer)) // entre 1 y 99

  if (n === 1) {
    return [{ numero: 1, monto: t, porcentaje: 100 }]
  }

  const montoPrimero = Math.round((t * p / 100) * 100) / 100
  const resto        = t - montoPrimero
  const numResto     = n - 1 // abonos 2..N

  if (numResto === 1) {
    // Solo 2 abonos — fácil
    return [
      { numero: 1, monto: montoPrimero, porcentaje: p },
      { numero: 2, monto: Math.round(resto * 100) / 100, porcentaje: 100 - p },
    ]
  }

  // N > 2: distribuir el resto equitativamente entre abonos intermedios
  // El último paga el saldo exacto para evitar redondeo
  const montoIntermedio = Math.round((resto / numResto) * 100) / 100
  const abonos: AbonoEsperado[] = [
    { numero: 1, monto: montoPrimero, porcentaje: p },
  ]

  let acumulado = montoPrimero
  for (let i = 2; i <= n - 1; i++) {
    acumulado += montoIntermedio
    abonos.push({
      numero:     i,
      monto:      montoIntermedio,
      porcentaje: Math.round(montoIntermedio / t * 100),
    })
  }

  // Último abono = saldo exacto
  const saldoFinal = Math.round((t - acumulado) * 100) / 100
  abonos.push({
    numero:     n,
    monto:      saldoFinal,
    porcentaje: Math.round(saldoFinal / t * 100),
  })

  return abonos
}

/**
 * Dado lo ya pagado, devuelve qué abono sigue y su monto esperado
 */
export function siguienteAbono(
  total: number,
  num_abonos: number,
  porcentaje_primer: number,
  pagosRealizados: number   // cuántos pagos ya hay
): { numero: number; montoEsperado: number; esUltimo: boolean } | null {
  const abonos = calcularAbonos(total, num_abonos, porcentaje_primer)
  const siguiente = abonos[pagosRealizados] // 0-indexed
  if (!siguiente) return null
  return {
    numero:        siguiente.numero,
    montoEsperado: siguiente.monto,
    esUltimo:      siguiente.numero === num_abonos,
  }
}