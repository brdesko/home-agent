export type QuarterSlot = { year: number; quarter: number }

export function getCurrentQuarter(): QuarterSlot {
  const now = new Date()
  return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 }
}

export function getRollingQuarters(n = 4): QuarterSlot[] {
  const { year, quarter } = getCurrentQuarter()
  const out: QuarterSlot[] = []
  let y = year, q = quarter
  for (let i = 0; i < n; i++) {
    out.push({ year: y, quarter: q })
    q++
    if (q > 4) { q = 1; y++ }
  }
  return out
}

export function isBeyond(slots: QuarterSlot[], targetYear: number | null, targetQuarter: number | null): boolean {
  if (!targetYear || !targetQuarter) return false
  return !slots.some(s => s.year === targetYear && s.quarter === targetQuarter)
}

export function quarterLabel(year: number, quarter: number): string {
  return `Q${quarter} ${year}`
}

export function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}
