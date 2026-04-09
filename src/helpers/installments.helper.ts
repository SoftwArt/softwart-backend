// src/helpers/installments.helper.ts

export type ExpectedInstallment = {
  number:     number   // 1-indexed
  amount:     number   // exact expected amount
  percentage: number   // % of total (informational)
}

/**
 * Calculates the expected amounts for each installment.
 * @param total             - Total sale value
 * @param num_abonos        - Number of configured installments
 * @param porcentaje_primer - Percentage of total for the first installment (0-100)
 */
export function calculateInstallments(
  total: number,
  num_abonos: number,
  porcentaje_primer: number
): ExpectedInstallment[] {
  const t = Number(total)
  const n = Math.max(1, num_abonos)
  const p = Math.min(99, Math.max(1, porcentaje_primer))

  if (n === 1) {
    return [{ number: 1, amount: t, percentage: 100 }]
  }

  const firstAmount = Math.round((t * p / 100) * 100) / 100
  const remainder   = t - firstAmount
  const remaining   = n - 1

  if (remaining === 1) {
    return [
      { number: 1, amount: firstAmount, percentage: p },
      { number: 2, amount: Math.round(remainder * 100) / 100, percentage: 100 - p },
    ]
  }

  // N > 2: distribute remainder equally among intermediate installments
  // Last installment pays exact balance to avoid rounding issues
  const intermediateAmount = Math.round((remainder / remaining) * 100) / 100
  const installments: ExpectedInstallment[] = [
    { number: 1, amount: firstAmount, percentage: p },
  ]

  let accumulated = firstAmount
  for (let i = 2; i <= n - 1; i++) {
    accumulated += intermediateAmount
    installments.push({
      number:     i,
      amount:     intermediateAmount,
      percentage: Math.round(intermediateAmount / t * 100),
    })
  }

  const finalBalance = Math.round((t - accumulated) * 100) / 100
  installments.push({
    number:     n,
    amount:     finalBalance,
    percentage: Math.round(finalBalance / t * 100),
  })

  return installments
}

/**
 * Given payments already made, returns the next installment and its expected amount.
 */
export function nextInstallment(
  total: number,
  num_abonos: number,
  porcentaje_primer: number,
  paymentsCount: number
): { number: number; expectedAmount: number; isLast: boolean } | null {
  const installments = calculateInstallments(total, num_abonos, porcentaje_primer)
  const next = installments[paymentsCount]
  if (!next) return null
  return {
    number:         next.number,
    expectedAmount: next.amount,
    isLast:         next.number === num_abonos,
  }
}
