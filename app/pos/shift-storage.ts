/**
 * Persistencia local del turno del POS (respaldo en localStorage para
 * sobrevivir refrescos de página; la fuente de verdad sigue siendo el backend).
 */
import type { AuditEntry, Invoice, Payment, ShiftReport } from "./types"

const SHIFT_STORAGE_KEY = "pos_shift_data"

export interface ShiftData {
  shiftReport: ShiftReport
  payments: Payment[]
  auditLog: AuditEntry[]
  currentCash: number
  invoices: Invoice[]
  turnoId: string
}

export function saveShiftData(data: ShiftData): void {
  try {
    const serializable = {
      ...data,
      shiftReport: { ...data.shiftReport, startTime: data.shiftReport.startTime.toISOString(), endTime: data.shiftReport.endTime?.toISOString() },
      payments: data.payments.map((p) => ({ ...p, timestamp: p.timestamp.toISOString() })),
      auditLog: data.auditLog.map((a) => ({ ...a, timestamp: a.timestamp.toISOString() })),
    }
    localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(serializable))
  } catch { /* ignore quota errors */ }
}

export function loadShiftData(): ShiftData | null {
  try {
    const raw = localStorage.getItem(SHIFT_STORAGE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    return {
      ...d,
      shiftReport: { ...d.shiftReport, startTime: new Date(d.shiftReport.startTime), endTime: d.shiftReport.endTime ? new Date(d.shiftReport.endTime) : undefined },
      payments: d.payments.map((p: any) => ({ ...p, timestamp: new Date(p.timestamp) })),
      auditLog: d.auditLog.map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) })),
    }
  } catch { return null }
}

export function clearShiftData(): void {
  localStorage.removeItem(SHIFT_STORAGE_KEY)
}
