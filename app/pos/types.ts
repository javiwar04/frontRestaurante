/**
 * Tipos del módulo POS. Extraídos de page.tsx para que los componentes
 * y helpers puedan compartirlos sin importar la página completa.
 */

export interface OrderItem {
  id: string
  backendItemId?: number            // id real del OrdenItem en backend (para editar/eliminar)
  name: string
  price: number
  quantity: number
  category: string
  modifiers?: Array<{ group: string; option: string; priceDelta: number; opcionId?: string }>
  notes?: string
  sent?: boolean                    // true = already sent to kitchen
  status?: "en_cocina" | "listo" | "entregado"
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category: string
}

export interface Payment {
  id: string
  backendPagoId?: string            // id del pago registrado en backend (para facturar)
  orderId: string
  tableNumber: number | string
  amount: number
  tenders: PaymentTenderDraft[]
  timestamp: Date
  userId: string
  userName: string
  invoiced: boolean
  items: OrderItem[]
  waiterId?: string
  waiterName?: string
  discountAmount: number
}

export interface Invoice {
  id: string
  paymentId: string
  tableNumber: number | string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  timestamp: Date
  customerName?: string
  customerRFC?: string
}

export interface ShiftReport {
  shiftId: string
  userId: string
  userName: string
  startTime: Date
  endTime?: Date
  totalSales: number
  totalOrders: number
  paymentMethods: { cash: number; card: number; transfer: number }
  productsUsed: Record<string, number>
}

export type Role = "cajero" | "mesero" | "supervisor"

export interface AuditEntry {
  id: string
  timestamp: Date
  userId: string
  userName: string
  role: Role
  action: string
  description?: string
}

export type TableAccount = {
  id: string
  label: string
  orderId: string
  backendOrdenId?: string           // real backend order ID
  startTime: number
  diners: number
  serviceType: "mesa" | "para_llevar" | "domicilio"
  status: "pendiente" | "en_cocina" | "lista" | "pagado"
  discountAmount: number
  items: OrderItem[]
}

export type SectorTableStatus = "available" | "occupied" | "reserved"
export type TableOrderEstado = "en_cocina" | "lista" | null

export type SectorTable = {
  id: string
  number: number
  label: string
  seats: number
  status: SectorTableStatus
  orderEstado?: TableOrderEstado
}
export type Sector = { id: string; name: string; tables: SectorTable[] }

export type PaymentTenderDraft = {
  id: string
  method: "cash" | "card" | "transfer"
  amount: number
  cardBatch?: string
  transferRef?: string
}

export type ModifierOption = { id: string; name: string; priceDelta?: number }
export type ModifierGroup = { id: string; name: string; type: "single" | "multiple"; required: boolean; min: number; max: number; options: ModifierOption[] }

export interface Waiter { id: string; name: string }

export interface PrintTicketData {
  kind: "payment" | "precount"
  ticketId: string
  timestamp: Date
  tableNumber?: number | string
  waiterName: string
  serviceType: string
  diners: number
  items: OrderItem[]
  discountAmount: number
  tenders: PaymentTenderDraft[]
  paidBy?: string
}

export interface PrintReportData {
  title: string
  lines: string[]
}

/** Datos del negocio para el encabezado de tickets (de /config/negocio) */
export interface NegocioInfo {
  nombre: string
  direccion?: string | null
  telefono?: string | null
  ticketFooter?: string | null
}

export const MAX_ACCOUNTS_PER_TABLE = 5

/** Suma de los deltas de precio de los modificadores de un item */
export const getModifiersPrice = (mods?: Array<{ priceDelta: number }>) =>
  (mods || []).reduce((sum, m) => sum + (m.priceDelta || 0), 0)
