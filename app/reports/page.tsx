"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getSession, clearSession, type AuthUser,
  reportes, establecimientos as establecimientosApi,
  pagos as pagosApi, ordenes as ordenesApi, config as configApi,
  type ReporteVentas, type ReportePlatillos, type ReporteMeseros, type Establecimiento, type Pago,
} from "@/lib/api"
import { ReprintReceiptView, type ReprintData } from "./reprint-receipt"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  BarChart3,
  LogOut,
  TrendingUp,
  Receipt,
  Users,
  UtensilsCrossed,
  Wallet,
  ShieldCheck,
  CalendarDays,
  CircleDollarSign,
  Star,
  Printer,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

// ─── Types ─────────────────────────────────────────────────────────────────────

type PaymentMethod = "Efectivo" | "Tarjeta Débito" | "Tarjeta Crédito" | "Transferencia"

interface TicketItem {
  name: string
  category: string
  qty: number
  unitPrice: number
}

interface Ticket {
  id: string
  date: string          // ISO string
  tableNumber: number
  waiter: string
  cashier: string
  items: TicketItem[]
  subtotal: number
  tax: number
  discount: number
  tip: number
  tipMethod: PaymentMethod
  total: number
  paymentMethod: PaymentMethod
  guestCount: number
}

// ─── Seed data ─────────────────────────────────────────────────────────────────

const makeDate = (daysAgo: number, hour: number, min = 0) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, min, 0, 0)
  return d.toISOString()
}

const seedTickets: Ticket[] = [
  // Today
  { id: "T001", date: makeDate(0, 13, 15), tableNumber: 3, waiter: "Juan", cashier: "cajero1", guestCount: 2, paymentMethod: "Efectivo", items: [{ name: "Hamburguesa Clásica", category: "Platos Principales", qty: 2, unitPrice: 12.99 }, { name: "Coca Cola", category: "Bebidas", qty: 2, unitPrice: 2.99 }], subtotal: 31.96, tax: 5.11, discount: 0, tip: 5.00, tipMethod: "Efectivo", total: 37.07 },
  { id: "T002", date: makeDate(0, 13, 45), tableNumber: 5, waiter: "María", cashier: "cajero1", guestCount: 4, paymentMethod: "Tarjeta Débito", items: [{ name: "Pizza Margarita", category: "Platos Principales", qty: 2, unitPrice: 14.99 }, { name: "Ensalada César", category: "Entradas", qty: 2, unitPrice: 9.99 }, { name: "Cerveza", category: "Bebidas", qty: 4, unitPrice: 4.99 }], subtotal: 69.94, tax: 11.19, discount: 0, tip: 10.00, tipMethod: "Tarjeta Débito", total: 91.13 },
  { id: "T003", date: makeDate(0, 14, 20), tableNumber: 1, waiter: "Juan", cashier: "cajero1", guestCount: 1, paymentMethod: "Efectivo", items: [{ name: "Pasta Carbonara", category: "Platos Principales", qty: 1, unitPrice: 13.99 }, { name: "Agua Mineral", category: "Bebidas", qty: 1, unitPrice: 1.99 }], subtotal: 15.98, tax: 2.56, discount: 0, tip: 2.00, tipMethod: "Efectivo", total: 20.54 },
  { id: "T004", date: makeDate(0, 15, 5), tableNumber: 7, waiter: "Carlos", cashier: "cajero2", guestCount: 6, paymentMethod: "Tarjeta Crédito", items: [{ name: "Alitas de Pollo", category: "Entradas", qty: 2, unitPrice: 10.99 }, { name: "Hamburguesa Clásica", category: "Platos Principales", qty: 3, unitPrice: 12.99 }, { name: "Pizza Margarita", category: "Platos Principales", qty: 1, unitPrice: 14.99 }, { name: "Cerveza", category: "Bebidas", qty: 6, unitPrice: 4.99 }], subtotal: 112.82, tax: 18.05, discount: 5.00, tip: 18.00, tipMethod: "Tarjeta Crédito", total: 143.87 },
  { id: "T005", date: makeDate(0, 15, 50), tableNumber: 2, waiter: "María", cashier: "cajero1", guestCount: 2, paymentMethod: "Transferencia", items: [{ name: "Ensalada César", category: "Entradas", qty: 1, unitPrice: 9.99 }, { name: "Pasta Carbonara", category: "Platos Principales", qty: 1, unitPrice: 13.99 }, { name: "Tiramisú", category: "Postres", qty: 1, unitPrice: 6.99 }], subtotal: 30.97, tax: 4.96, discount: 0, tip: 4.50, tipMethod: "Efectivo", total: 40.43 },
  { id: "T006", date: makeDate(0, 16, 30), tableNumber: 4, waiter: "Juan", cashier: "cajero2", guestCount: 3, paymentMethod: "Efectivo", items: [{ name: "Hamburguesa Clásica", category: "Platos Principales", qty: 3, unitPrice: 12.99 }, { name: "Coca Cola", category: "Bebidas", qty: 3, unitPrice: 2.99 }], subtotal: 47.94, tax: 7.67, discount: 0, tip: 7.00, tipMethod: "Efectivo", total: 62.61 },
  { id: "T007", date: makeDate(0, 17, 10), tableNumber: 6, waiter: "Carlos", cashier: "cajero2", guestCount: 2, paymentMethod: "Tarjeta Débito", items: [{ name: "Alitas de Pollo", category: "Entradas", qty: 1, unitPrice: 10.99 }, { name: "Pizza Margarita", category: "Platos Principales", qty: 1, unitPrice: 14.99 }, { name: "Helado", category: "Postres", qty: 2, unitPrice: 5.99 }], subtotal: 37.96, tax: 6.07, discount: 0, tip: 5.00, tipMethod: "Tarjeta Débito", total: 49.03 },
  { id: "T008", date: makeDate(0, 18, 0), tableNumber: 8, waiter: "María", cashier: "cajero1", guestCount: 4, paymentMethod: "Efectivo", items: [{ name: "Hamburguesa Clásica", category: "Platos Principales", qty: 4, unitPrice: 12.99 }, { name: "Cerveza", category: "Bebidas", qty: 4, unitPrice: 4.99 }, { name: "Tiramisú", category: "Postres", qty: 2, unitPrice: 6.99 }], subtotal: 79.90, tax: 12.78, discount: 0, tip: 12.00, tipMethod: "Efectivo", total: 104.68 },
  // Yesterday
  { id: "T009", date: makeDate(1, 12, 30), tableNumber: 2, waiter: "Juan", cashier: "cajero1", guestCount: 2, paymentMethod: "Efectivo", items: [{ name: "Ensalada César", category: "Entradas", qty: 2, unitPrice: 9.99 }, { name: "Agua Mineral", category: "Bebidas", qty: 2, unitPrice: 1.99 }], subtotal: 23.96, tax: 3.83, discount: 0, tip: 3.00, tipMethod: "Efectivo", total: 30.79 },
  { id: "T010", date: makeDate(1, 13, 0), tableNumber: 4, waiter: "María", cashier: "cajero1", guestCount: 4, paymentMethod: "Tarjeta Crédito", items: [{ name: "Pizza Margarita", category: "Platos Principales", qty: 2, unitPrice: 14.99 }, { name: "Alitas de Pollo", category: "Entradas", qty: 2, unitPrice: 10.99 }, { name: "Cerveza", category: "Bebidas", qty: 4, unitPrice: 4.99 }], subtotal: 71.94, tax: 11.51, discount: 0, tip: 14.00, tipMethod: "Tarjeta Crédito", total: 97.45 },
  { id: "T011", date: makeDate(1, 14, 15), tableNumber: 7, waiter: "Carlos", cashier: "cajero2", guestCount: 8, paymentMethod: "Tarjeta Crédito", items: [{ name: "Hamburguesa Clásica", category: "Platos Principales", qty: 4, unitPrice: 12.99 }, { name: "Pizza Margarita", category: "Platos Principales", qty: 2, unitPrice: 14.99 }, { name: "Coca Cola", category: "Bebidas", qty: 8, unitPrice: 2.99 }, { name: "Tiramisú", category: "Postres", qty: 4, unitPrice: 6.99 }], subtotal: 127.80, tax: 20.45, discount: 10.00, tip: 25.00, tipMethod: "Tarjeta Crédito", total: 163.25 },
  { id: "T012", date: makeDate(1, 15, 45), tableNumber: 1, waiter: "Juan", cashier: "cajero1", guestCount: 1, paymentMethod: "Efectivo", items: [{ name: "Pasta Carbonara", category: "Platos Principales", qty: 1, unitPrice: 13.99 }, { name: "Helado", category: "Postres", qty: 1, unitPrice: 5.99 }], subtotal: 19.98, tax: 3.20, discount: 0, tip: 3.00, tipMethod: "Efectivo", total: 26.18 },
  { id: "T013", date: makeDate(1, 19, 0), tableNumber: 3, waiter: "María", cashier: "cajero2", guestCount: 3, paymentMethod: "Transferencia", items: [{ name: "Alitas de Pollo", category: "Entradas", qty: 1, unitPrice: 10.99 }, { name: "Hamburguesa Clásica", category: "Platos Principales", qty: 3, unitPrice: 12.99 }, { name: "Cerveza", category: "Bebidas", qty: 3, unitPrice: 4.99 }], subtotal: 54.92, tax: 8.79, discount: 0, tip: 8.00, tipMethod: "Efectivo", total: 71.71 },
  // 2 days ago
  { id: "T014", date: makeDate(2, 12, 0), tableNumber: 5, waiter: "Carlos", cashier: "cajero1", guestCount: 2, paymentMethod: "Efectivo", items: [{ name: "Ensalada César", category: "Entradas", qty: 2, unitPrice: 9.99 }, { name: "Pasta Carbonara", category: "Platos Principales", qty: 2, unitPrice: 13.99 }], subtotal: 47.96, tax: 7.67, discount: 0, tip: 7.00, tipMethod: "Efectivo", total: 62.63 },
  { id: "T015", date: makeDate(2, 14, 30), tableNumber: 3, waiter: "Juan", cashier: "cajero1", guestCount: 5, paymentMethod: "Tarjeta Débito", items: [{ name: "Pizza Margarita", category: "Platos Principales", qty: 3, unitPrice: 14.99 }, { name: "Alitas de Pollo", category: "Entradas", qty: 2, unitPrice: 10.99 }, { name: "Coca Cola", category: "Bebidas", qty: 5, unitPrice: 2.99 }], subtotal: 81.88, tax: 13.10, discount: 5.00, tip: 12.00, tipMethod: "Tarjeta Débito", total: 101.98 },
  { id: "T016", date: makeDate(2, 20, 0), tableNumber: 7, waiter: "María", cashier: "cajero2", guestCount: 10, paymentMethod: "Tarjeta Crédito", items: [{ name: "Hamburguesa Clásica", category: "Platos Principales", qty: 5, unitPrice: 12.99 }, { name: "Pizza Margarita", category: "Platos Principales", qty: 3, unitPrice: 14.99 }, { name: "Cerveza", category: "Bebidas", qty: 10, unitPrice: 4.99 }, { name: "Helado", category: "Postres", qty: 5, unitPrice: 5.99 }], subtotal: 179.70, tax: 28.75, discount: 20.00, tip: 35.00, tipMethod: "Tarjeta Crédito", total: 223.45 },
  // 3 days ago
  { id: "T017", date: makeDate(3, 13, 0), tableNumber: 2, waiter: "Carlos", cashier: "cajero1", guestCount: 2, paymentMethod: "Efectivo", items: [{ name: "Hamburguesa Clásica", category: "Platos Principales", qty: 2, unitPrice: 12.99 }, { name: "Agua Mineral", category: "Bebidas", qty: 2, unitPrice: 1.99 }], subtotal: 29.96, tax: 4.79, discount: 0, tip: 4.00, tipMethod: "Efectivo", total: 38.75 },
  { id: "T018", date: makeDate(3, 15, 30), tableNumber: 6, waiter: "Juan", cashier: "cajero2", guestCount: 3, paymentMethod: "Tarjeta Débito", items: [{ name: "Alitas de Pollo", category: "Entradas", qty: 1, unitPrice: 10.99 }, { name: "Pasta Carbonara", category: "Platos Principales", qty: 3, unitPrice: 13.99 }, { name: "Tiramisú", category: "Postres", qty: 2, unitPrice: 6.99 }], subtotal: 64.92, tax: 10.39, discount: 0, tip: 10.00, tipMethod: "Tarjeta Débito", total: 85.31 },
  // 4 days ago
  { id: "T019", date: makeDate(4, 12, 45), tableNumber: 1, waiter: "María", cashier: "cajero1", guestCount: 2, paymentMethod: "Efectivo", items: [{ name: "Ensalada César", category: "Entradas", qty: 1, unitPrice: 9.99 }, { name: "Hamburguesa Clásica", category: "Platos Principales", qty: 2, unitPrice: 12.99 }, { name: "Coca Cola", category: "Bebidas", qty: 2, unitPrice: 2.99 }], subtotal: 41.95, tax: 6.71, discount: 0, tip: 6.00, tipMethod: "Efectivo", total: 54.66 },
  { id: "T020", date: makeDate(4, 18, 0), tableNumber: 4, waiter: "Carlos", cashier: "cajero2", guestCount: 4, paymentMethod: "Tarjeta Crédito", items: [{ name: "Pizza Margarita", category: "Platos Principales", qty: 2, unitPrice: 14.99 }, { name: "Alitas de Pollo", category: "Entradas", qty: 2, unitPrice: 10.99 }, { name: "Cerveza", category: "Bebidas", qty: 4, unitPrice: 4.99 }, { name: "Helado", category: "Postres", qty: 2, unitPrice: 5.99 }], subtotal: 83.86, tax: 13.42, discount: 0, tip: 15.00, tipMethod: "Tarjeta Crédito", total: 112.28 },
  // 5 days ago
  { id: "T021", date: makeDate(5, 13, 30), tableNumber: 3, waiter: "Juan", cashier: "cajero1", guestCount: 3, paymentMethod: "Efectivo", items: [{ name: "Hamburguesa Clásica", category: "Platos Principales", qty: 3, unitPrice: 12.99 }, { name: "Coca Cola", category: "Bebidas", qty: 3, unitPrice: 2.99 }], subtotal: 47.94, tax: 7.67, discount: 0, tip: 7.00, tipMethod: "Efectivo", total: 62.61 },
  { id: "T022", date: makeDate(5, 16, 0), tableNumber: 8, waiter: "María", cashier: "cajero2", guestCount: 6, paymentMethod: "Transferencia", items: [{ name: "Pizza Margarita", category: "Platos Principales", qty: 3, unitPrice: 14.99 }, { name: "Pasta Carbonara", category: "Platos Principales", qty: 2, unitPrice: 13.99 }, { name: "Cerveza", category: "Bebidas", qty: 6, unitPrice: 4.99 }, { name: "Tiramisú", category: "Postres", qty: 3, unitPrice: 6.99 }], subtotal: 124.86, tax: 19.98, discount: 10.00, tip: 20.00, tipMethod: "Efectivo", total: 154.84 },
  // 6 days ago
  { id: "T023", date: makeDate(6, 11, 0), tableNumber: 5, waiter: "Carlos", cashier: "cajero1", guestCount: 2, paymentMethod: "Efectivo", items: [{ name: "Alitas de Pollo", category: "Entradas", qty: 1, unitPrice: 10.99 }, { name: "Hamburguesa Clásica", category: "Platos Principales", qty: 2, unitPrice: 12.99 }, { name: "Agua Mineral", category: "Bebidas", qty: 2, unitPrice: 1.99 }], subtotal: 40.95, tax: 6.55, discount: 0, tip: 6.00, tipMethod: "Efectivo", total: 53.50 },
  { id: "T024", date: makeDate(6, 19, 30), tableNumber: 7, waiter: "Juan", cashier: "cajero2", guestCount: 8, paymentMethod: "Tarjeta Crédito", items: [{ name: "Hamburguesa Clásica", category: "Platos Principales", qty: 4, unitPrice: 12.99 }, { name: "Pizza Margarita", category: "Platos Principales", qty: 2, unitPrice: 14.99 }, { name: "Alitas de Pollo", category: "Entradas", qty: 2, unitPrice: 10.99 }, { name: "Cerveza", category: "Bebidas", qty: 8, unitPrice: 4.99 }, { name: "Helado", category: "Postres", qty: 4, unitPrice: 5.99 }], subtotal: 165.76, tax: 26.52, discount: 15.00, tip: 30.00, tipMethod: "Tarjeta Crédito", total: 207.28 },
  // Past month samples
  { id: "T025", date: makeDate(10, 14, 0), tableNumber: 2, waiter: "María", cashier: "cajero1", guestCount: 2, paymentMethod: "Efectivo", items: [{ name: "Pasta Carbonara", category: "Platos Principales", qty: 2, unitPrice: 13.99 }, { name: "Tiramisú", category: "Postres", qty: 2, unitPrice: 6.99 }], subtotal: 41.96, tax: 6.71, discount: 0, tip: 6.00, tipMethod: "Efectivo", total: 54.67 },
  { id: "T026", date: makeDate(12, 13, 0), tableNumber: 4, waiter: "Carlos", cashier: "cajero2", guestCount: 4, paymentMethod: "Tarjeta Débito", items: [{ name: "Hamburguesa Clásica", category: "Platos Principales", qty: 4, unitPrice: 12.99 }, { name: "Coca Cola", category: "Bebidas", qty: 4, unitPrice: 2.99 }], subtotal: 63.92, tax: 10.23, discount: 0, tip: 9.00, tipMethod: "Tarjeta Débito", total: 83.15 },
  { id: "T027", date: makeDate(15, 20, 0), tableNumber: 7, waiter: "Juan", cashier: "cajero1", guestCount: 10, paymentMethod: "Tarjeta Crédito", items: [{ name: "Pizza Margarita", category: "Platos Principales", qty: 5, unitPrice: 14.99 }, { name: "Alitas de Pollo", category: "Entradas", qty: 4, unitPrice: 10.99 }, { name: "Cerveza", category: "Bebidas", qty: 10, unitPrice: 4.99 }, { name: "Helado", category: "Postres", qty: 5, unitPrice: 5.99 }], subtotal: 199.75, tax: 31.96, discount: 20.00, tip: 40.00, tipMethod: "Tarjeta Crédito", total: 251.71 },
  { id: "T028", date: makeDate(20, 12, 0), tableNumber: 1, waiter: "María", cashier: "cajero2", guestCount: 1, paymentMethod: "Efectivo", items: [{ name: "Ensalada César", category: "Entradas", qty: 1, unitPrice: 9.99 }, { name: "Agua Mineral", category: "Bebidas", qty: 1, unitPrice: 1.99 }], subtotal: 11.98, tax: 1.92, discount: 0, tip: 1.50, tipMethod: "Efectivo", total: 15.40 },
  { id: "T029", date: makeDate(25, 19, 0), tableNumber: 6, waiter: "Carlos", cashier: "cajero1", guestCount: 6, paymentMethod: "Transferencia", items: [{ name: "Hamburguesa Clásica", category: "Platos Principales", qty: 3, unitPrice: 12.99 }, { name: "Pizza Margarita", category: "Platos Principales", qty: 2, unitPrice: 14.99 }, { name: "Cerveza", category: "Bebidas", qty: 6, unitPrice: 4.99 }, { name: "Tiramisú", category: "Postres", qty: 3, unitPrice: 6.99 }], subtotal: 99.84, tax: 15.97, discount: 5.00, tip: 15.00, tipMethod: "Efectivo", total: 125.81 },
  { id: "T030", date: makeDate(28, 15, 30), tableNumber: 3, waiter: "Juan", cashier: "cajero2", guestCount: 3, paymentMethod: "Tarjeta Débito", items: [{ name: "Alitas de Pollo", category: "Entradas", qty: 2, unitPrice: 10.99 }, { name: "Pasta Carbonara", category: "Platos Principales", qty: 3, unitPrice: 13.99 }, { name: "Helado", category: "Postres", qty: 3, unitPrice: 5.99 }], subtotal: 81.91, tax: 13.11, discount: 0, tip: 12.00, tipMethod: "Tarjeta Débito", total: 107.02 },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

const isSameDay = (a: string, b: Date) => {
  const da = new Date(a)
  return da.getFullYear() === b.getFullYear() && da.getMonth() === b.getMonth() && da.getDate() === b.getDate()
}

const toDateStr = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })
const toTimeStr = (iso: string) => new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })

const paymentColor: Record<string, string> = {
  Efectivo: "text-green-500",
  "Tarjeta Débito": "text-blue-500",
  "Tarjeta Crédito": "text-purple-500",
  "Transferencia": "text-orange-500",
}
const paymentBadgeVariant = (m: string): "default" | "secondary" | "outline" => {
  const ml = m.toLowerCase()
  if (ml === "efectivo") return "default"
  if (ml.includes("tarjet")) return "secondary"
  return "outline"
}

const toLocalDateTime = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const session = getSession("reports")
    if (!session) { router.push("/reports/login"); return }
    setUser(session.user)
  }, [router])

  const [activeTab, setActiveTab] = useState("summary")

  // ── Period filter ──────────────────────────────────────────────────────────
  const [sucursales, setSucursales] = useState<Establecimiento[]>([])
  const [filtroSucursal, setFiltroSucursal] = useState<string>("all")   // "all" = consolidado
  const [period, setPeriod] = useState<"today" | "week" | "month" | "range">("today")
  const [rangeFrom, setRangeFrom] = useState("")
  const [rangeTo, setRangeTo] = useState("")
  const [apiVentas, setApiVentas] = useState<ReporteVentas | null>(null)
  const [apiPlatillos, setApiPlatillos] = useState<ReportePlatillos | null>(null)
  const [apiMeseros, setApiMeseros] = useState<ReporteMeseros | null>(null)
  const [apiVentasHoy, setApiVentasHoy] = useState<ReporteVentas | null>(null)
  const [apiPlatillosHoy, setApiPlatillosHoy] = useState<ReportePlatillos | null>(null)

  useEffect(() => {
    if (!user) return
    const now = new Date()
    let desde: string; let hasta: string
    if (period === "today") {
      const s = new Date(now); s.setHours(0,0,0,0)
      const e = new Date(now); e.setHours(23,59,59,999)
      desde = toLocalDateTime(s); hasta = toLocalDateTime(e)
    } else if (period === "week") {
      const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0,0,0,0)
      desde = toLocalDateTime(s); hasta = toLocalDateTime(now)
    } else if (period === "month") {
      const s = new Date(now); s.setDate(s.getDate() - 29); s.setHours(0,0,0,0)
      desde = toLocalDateTime(s); hasta = toLocalDateTime(now)
    } else if (rangeFrom && rangeTo) {
      desde = rangeFrom + "T00:00:00"; hasta = rangeTo + "T23:59:59"
    } else { return }
    const est = filtroSucursal === "all" ? undefined : filtroSucursal
    reportes.ventas(desde, hasta, "reports", est).then(setApiVentas).catch((e) => toast({ title: "Error en reporte de ventas", description: String((e as any)?.message ?? e), variant: "destructive" }))
    reportes.platillos(desde, hasta, "reports", est).then(setApiPlatillos).catch((e) => toast({ title: "Error en reporte de productos", description: String((e as any)?.message ?? e), variant: "destructive" }))
    reportes.meseros(desde, hasta, "reports", est).then(setApiMeseros).catch((e) => toast({ title: "Error en reporte por mesero", description: String((e as any)?.message ?? e), variant: "destructive" }))
  }, [user, period, rangeFrom, rangeTo, filtroSucursal])

  useEffect(() => {
    if (!user) return
    const s = new Date(); s.setHours(0, 0, 0, 0)
    const e = new Date(); e.setHours(23, 59, 59, 999)
    const est = filtroSucursal === "all" ? undefined : filtroSucursal
    reportes.ventas(toLocalDateTime(s), toLocalDateTime(e), "reports", est).then(setApiVentasHoy).catch(() => {})
    reportes.platillos(toLocalDateTime(s), toLocalDateTime(e), "reports", est).then(setApiPlatillosHoy).catch(() => {})
  }, [user, filtroSucursal])

  useEffect(() => {
    if (!user) return
    establecimientosApi.getAll("reports").then(setSucursales).catch(() => {})
  }, [user])

  // ── Reimpresión de cuentas (pagos del backend, persistentes) ────────────────
  const [reprintPagos, setReprintPagos] = useState<Pago[]>([])
  const [reprintNegocio, setReprintNegocio] = useState<ReprintData["negocio"]>({})
  const [reprintData, setReprintData] = useState<ReprintData | null>(null)
  const [reprintingId, setReprintingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    pagosApi.getAll("reports").then(setReprintPagos).catch(() => {})
    configApi.getNegocio("reports")
      .then((c) => setReprintNegocio({ nombre: c.nombre, direccion: c.direccion, telefono: c.telefono }))
      .catch(() => {})
  }, [user, filtroSucursal])

  const reimprimirPago = async (pago: Pago) => {
    setReprintingId(pago.id)
    try {
      const orden = await ordenesApi.getOne(pago.ordenId, "reports")
      setReprintData({ orden, pago, negocio: reprintNegocio })
      // Dar un tick para que el recibo se renderice antes de mandar a imprimir
      setTimeout(() => window.print(), 120)
    } catch (e) {
      toast({ title: "No se pudo reimprimir", description: String((e as { message?: string })?.message ?? e), variant: "destructive" })
    } finally {
      setReprintingId(null)
    }
  }

  const logout = () => {
    clearSession("reports")
    router.push("/reports/login")
  }

  const today = new Date()

  // ── Summary KPIs ────────────────────────────────────────────────────────────
  // ── Summary KPIs (today) ─────────────────────────────────────────────────────────
  const totalSales = apiVentasHoy?.totalVentas ?? 0
  const totalOrders = apiVentasHoy?.totalOrdenes ?? 0
  const avgTicket = apiVentasHoy?.ticketPromedio ?? 0
  const cashTotal = apiVentasHoy?.porMetodoPago?.["Efectivo"] ?? apiVentasHoy?.porMetodoPago?.["efectivo"] ?? 0

  const paymentBreakdown = useMemo(() => {
    if (!apiVentasHoy?.porMetodoPago) return []
    return Object.entries(apiVentasHoy.porMetodoPago)
      .filter(([, total]) => total > 0)
      .map(([method, total]) => ({ method, total }))
  }, [apiVentasHoy])

  // ── Sales by day (for chart) ────────────────────────────────────────────────
  const salesByDay = useMemo(() => {
    if (!apiVentas?.porDia) return []
    return apiVentas.porDia.map(d => ({
      label: new Date(d.fecha + "T12:00:00").toLocaleDateString("es-MX",
        period === "month" ? { day: "2-digit", month: "2-digit" } : { weekday: "short", day: "2-digit" }),
      total: d.total,
      ordenes: d.ordenes,
      date: d.fecha,
    }))
  }, [apiVentas, period])

  const maxDayTotal = Math.max(...salesByDay.map(d => d.total), 1)

  // ── Products ranking ────────────────────────────────────────────────────────
  const [productView, setProductView] = useState<"all" | "category">("all")
  const productRanking = useMemo(() => {
    if (!apiPlatillos?.platillos) return []
    return apiPlatillos.platillos.map(p => ({
      name: p.nombre,
      category: "",
      qty: p.cantidadVendida,
      revenue: p.totalGenerado,
    }))
  }, [apiPlatillos])

  const categoryRanking = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>()
    productRanking.forEach(p => {
      const prev = map.get(p.category) || { name: p.category, qty: 0, revenue: 0 }
      map.set(p.category, { ...prev, qty: prev.qty + p.qty, revenue: prev.revenue + p.revenue })
    })
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [productRanking])

  // ── Users ranking ───────────────────────────────────────────────────────────
  const userRanking = useMemo(() => {
    if (!apiMeseros?.meseros) return []
    return apiMeseros.meseros.map(m => ({
      name: m.nombre,
      tickets: m.ordenes,
      total: m.totalVentas,
      tip: 0,
      avg: m.ordenes ? m.totalVentas / m.ordenes : 0,
    }))
  }, [apiMeseros])

  // ── History data ─────────────────────────────────────────────────────────
  const historyDays = useMemo(() => {
    if (!apiVentas?.porDia) return []
    return [...apiVentas.porDia].sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [apiVentas])

  // ── Corte de caja ───────────────────────────────────────────────────────────
  const [cashIn, setCashIn] = useState("")
  const [cutDone, setCutDone] = useState(false)
  const [cutTimestamp, setCutTimestamp] = useState("")

  const expectedCash = apiVentasHoy?.porMetodoPago?.["Efectivo"] ?? apiVentasHoy?.porMetodoPago?.["efectivo"] ?? 0
  const cashDiff = cashIn ? Number(cashIn) - expectedCash : null

  const doCorte = () => {
    if (!cashIn) { toast({ title: "Ingresa el efectivo contado antes de cerrar" }); return }
    reportes.corteCaja().then(() => {
      setCutTimestamp(new Date().toLocaleString("es-MX"))
      setCutDone(true)
      toast({ title: "Corte de caja registrado", description: new Date().toLocaleString("es-MX") })
    }).catch(() => {
      setCutTimestamp(new Date().toLocaleString("es-MX"))
      setCutDone(true)
      toast({ title: "Corte registrado localmente", description: new Date().toLocaleString("es-MX") })
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>

  const PeriodSelector = () => (
    <div className="flex flex-wrap items-center gap-2">
      {(["today", "week", "month", "range"] as const).map(p => (
        <Button key={p} size="sm" variant={period === p ? "default" : "outline"}
          className={period !== p ? "bg-transparent" : ""}
          onClick={() => setPeriod(p)}>
          {p === "today" ? "Hoy" : p === "week" ? "7 días" : p === "month" ? "30 días" : "Rango"}
        </Button>
      ))}
      {period === "range" && (
        <>
          <Input type="date" className="h-8 w-36" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} />
          <span className="text-xs text-muted-foreground">—</span>
          <Input type="date" className="h-8 w-36" value={rangeTo} onChange={e => setRangeTo(e.target.value)} />
        </>
      )}
      {sucursales.length > 0 && (
        <Select value={filtroSucursal} onValueChange={setFiltroSucursal}>
          <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sucursales</SelectItem>
            {sucursales.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <span className="text-xs text-muted-foreground">{apiVentas?.totalOrdenes ?? 0} tickets</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/")} title="Volver al panel">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Reportes</h1>
                <p className="text-xs text-muted-foreground">{user.username} · {today.toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1" />Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="summary"><BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />Resumen</TabsTrigger>
            <TabsTrigger value="sales"><TrendingUp className="w-4 h-4 mr-1 hidden sm:inline" />Ventas</TabsTrigger>
            <TabsTrigger value="products"><UtensilsCrossed className="w-4 h-4 mr-1 hidden sm:inline" />Platillos</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-1 hidden sm:inline" />Meseros</TabsTrigger>
            <TabsTrigger value="history"><Receipt className="w-4 h-4 mr-1 hidden sm:inline" />Historial</TabsTrigger>
            <TabsTrigger value="reprint"><Printer className="w-4 h-4 mr-1 hidden sm:inline" />Reimprimir</TabsTrigger>
            <TabsTrigger value="cut"><ShieldCheck className="w-4 h-4 mr-1 hidden sm:inline" />Corte</TabsTrigger>
          </TabsList>

          {/* ══ RESUMEN DEL DÍA ══ */}
          <TabsContent value="summary" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Resumen de hoy</h2>
              <Badge variant="outline" className="gap-1"><CalendarDays className="w-3 h-3" />{toDateStr(today.toISOString())}</Badge>
            </div>

            {/* Ventas por sucursal (consolidado del negocio) */}
            {filtroSucursal === "all" && (apiVentas?.porEstablecimiento?.length ?? 0) > 1 && (
              <Card className="border-border">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Ventas por sucursal</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(() => {
                    const items = apiVentas!.porEstablecimiento!
                    const max = Math.max(1, ...items.map(e => e.total))
                    return items.map((e) => (
                      <div key={e.establecimientoId ?? e.nombre} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{e.nombre}</span>
                          <span>Q{e.total.toFixed(2)} · {e.ordenes} tickets</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(e.total / max) * 100}%` }} />
                        </div>
                      </div>
                    ))
                  })()}
                </CardContent>
              </Card>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Ventas del día</div>
                    <div className="text-2xl font-bold text-primary">Q{totalSales.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{totalOrders} tickets</div>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2 mt-0.5 shrink-0"><TrendingUp className="w-5 h-5 text-primary" /></div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Efectivo en caja</div>
                    <div className="text-2xl font-bold text-green-500">Q{cashTotal.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Incl. propina efectivo</div>
                  </div>
                  <div className="rounded-lg bg-green-500/10 p-2 mt-0.5 shrink-0"><Wallet className="w-5 h-5 text-green-500" /></div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Órdenes del día</div>
                    <div className="text-2xl font-bold text-yellow-500">{totalOrders}</div>
                    <div className="text-xs text-muted-foreground">Ticket promedio: Q{avgTicket.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-yellow-500/10 p-2 mt-0.5 shrink-0"><Star className="w-5 h-5 text-yellow-500" /></div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Promedio / ticket</div>
                    <div className="text-2xl font-bold">Q{avgTicket.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-muted p-2 mt-0.5 shrink-0"><CircleDollarSign className="w-5 h-5 text-muted-foreground" /></div>
                </CardContent>
              </Card>
            </div>

            {/* Métodos de pago */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Desglose por método de pago (hoy)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentBreakdown.length === 0
                  ? <p className="text-xs text-muted-foreground italic">Sin ventas hoy</p>
                  : paymentBreakdown.map(pb => (
                    <div key={pb.method}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={paymentBadgeVariant(pb.method)} className="text-xs">{pb.method}</Badge>
                        </div>
                        <span className={`font-semibold text-sm ${paymentColor[pb.method] ?? ""}`}>Q{pb.total.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(pb.total / totalSales) * 100}%` }} />
                      </div>
                    </div>
                  ))
                }
              </CardContent>
            </Card>

            {/* Top 3 platillos */}
            {apiPlatillosHoy?.platillos && apiPlatillosHoy.platillos.length > 0 && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />Top platillos del día</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {apiPlatillosHoy.platillos.slice(0, 3).map((p, i) => (
                      <div key={p.platilloId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
                        <div className={`text-lg font-black w-6 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : "text-amber-600"}`}>{i + 1}</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{p.nombre}</div>
                          <div className="text-xs text-muted-foreground">{p.cantidadVendida} unidades</div>
                        </div>
                        <div className="text-sm font-semibold text-primary">Q{p.totalGenerado.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══ VENTAS POR PERIODO ══ */}
          <TabsContent value="sales" className="space-y-5">
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-semibold">Ventas por periodo</h2>
              <PeriodSelector />
            </div>

            {/* KPIs periodo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total vendido", value: `Q${(apiVentas?.totalVentas ?? 0).toFixed(2)}`, color: "text-primary" },
                { label: "Tickets", value: (apiVentas?.totalOrdenes ?? 0).toString(), color: "" },
                { label: "Ticket promedio", value: `Q${(apiVentas?.ticketPromedio ?? 0).toFixed(2)}`, color: "" },
                { label: "Días con datos", value: (apiVentas?.porDia?.length ?? 0).toString(), color: "text-muted-foreground" },
              ].map(k => (
                <Card key={k.label} className="border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">{k.label}</div>
                    <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Bar chart */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Ventas diarias</CardTitle>
                <CardDescription>
                  Máximo del periodo: Q{Math.max(...salesByDay.map(d => d.total), 0).toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-40 w-full overflow-x-auto pb-1">
                  {salesByDay.map(d => (
                    <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-[28px] group">
                      <div className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Q{d.total.toFixed(0)}
                      </div>
                      <div
                        className="w-full rounded-sm bg-primary/80 hover:bg-primary transition-colors cursor-default min-h-[2px]"
                        style={{ height: `${Math.max((d.total / maxDayTotal) * 120, d.total > 0 ? 4 : 2)}px` }}
                        title={`${d.label}: Q${d.total.toFixed(2)}`}
                      />
                      {salesByDay.length <= 14 && (
                        <div className="text-xs text-muted-foreground">{d.label}</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Desglose por método en periodo */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Métodos de pago en el periodo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {apiVentas?.porMetodoPago
                  ? Object.entries(apiVentas.porMetodoPago).filter(([, v]) => v > 0).map(([m, mTotal]) => {
                    const periodTotal = apiVentas.totalVentas || 1
                    return (
                      <div key={m} className="flex items-center gap-3">
                        <Badge variant={paymentBadgeVariant(m)} className="text-xs w-32 justify-center shrink-0">{m}</Badge>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(mTotal / periodTotal) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold w-20 text-right">Q{mTotal.toFixed(2)}</span>
                      </div>
                    )
                  })
                  : <p className="text-xs text-muted-foreground italic">Sin datos en el periodo</p>
                }
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ PLATILLOS ══ */}
          <TabsContent value="products" className="space-y-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Platillos más vendidos</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant={productView === "all" ? "default" : "outline"} className={productView !== "all" ? "bg-transparent" : ""} onClick={() => setProductView("all")}>Por platillo</Button>
                  <Button size="sm" variant={productView === "category" ? "default" : "outline"} className={productView !== "category" ? "bg-transparent" : ""} onClick={() => setProductView("category")}>Por categoría</Button>
                </div>
              </div>
              <PeriodSelector />
            </div>

            {productView === "all" ? (
              <div className="space-y-2">
                {productRanking.length === 0
                  ? <p className="text-sm text-muted-foreground py-8 text-center">Sin datos en el periodo seleccionado</p>
                  : productRanking.map((p, i) => {
                    const maxQty = productRanking[0]?.qty || 1
                    return (
                      <Card key={p.name} className="border-border">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`text-sm font-black w-5 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div>
                                  <span className="text-sm font-medium">{p.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{p.category}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-primary">Q{p.revenue.toFixed(2)}</div>
                                  <div className="text-xs text-muted-foreground">{p.qty} uds</div>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-primary/80" style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            ) : (
              <div className="space-y-3">
                {categoryRanking.map((cat, i) => {
                  const catItems = productRanking.filter(p => p.category === cat.name)
                  return (
                    <Card key={cat.name} className="border-border">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-black ${i === 0 ? "text-yellow-500" : "text-muted-foreground"}`}>{i + 1}</span>
                            <CardTitle className="text-sm">{cat.name}</CardTitle>
                            <span className="text-xs text-muted-foreground">{cat.qty} uds</span>
                          </div>
                          <span className="font-semibold text-sm text-primary">Q{cat.revenue.toFixed(2)}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="space-y-1">
                          {catItems.map(item => (
                            <div key={item.name} className="flex items-center justify-between text-xs text-muted-foreground pl-4">
                              <span>{item.name}</span>
                              <span>{item.qty} uds · Q{item.revenue.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ══ MESEROS ══ */}
          <TabsContent value="users" className="space-y-5">
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-semibold">Rendimiento por mesero</h2>
              <PeriodSelector />
            </div>

            <div className="space-y-3">
              {userRanking.length === 0
                ? <p className="text-sm text-muted-foreground py-8 text-center">Sin datos en el periodo</p>
                : userRanking.map((u, i) => {
                  const maxTotal = userRanking[0]?.total || 1
                  return (
                    <Card key={u.name} className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`text-2xl font-black w-7 text-center mt-0.5 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>{i + 1}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="font-semibold">{u.name}</div>
                                <div className="text-xs text-muted-foreground">{u.tickets} tickets · Promedio Q{u.avg.toFixed(2)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-primary">Q{u.total.toFixed(2)}</div>
                                <div className="text-xs text-yellow-500">Propinas: Q{u.tip.toFixed(2)}</div>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary/80" style={{ width: `${(u.total / maxTotal) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>

          </TabsContent>

          {/* ══ HISTORIAL ══ */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-semibold">Historial por día</h2>
              <PeriodSelector />
            </div>
            {historyDays.length === 0
              ? (
                <div className="py-16 text-center">
                  <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Sin datos en el periodo seleccionado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyDays.map(d => (
                    <Card key={d.fecha} className="border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">
                              {new Date(d.fecha + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                            </div>
                            <div className="text-xs text-muted-foreground">{d.ordenes} órdenes</div>
                          </div>
                          <div className="text-lg font-bold text-primary">Q{d.total.toFixed(2)}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            }
          </TabsContent>

          {/* ══ REIMPRIMIR CUENTAS ══ */}
          <TabsContent value="reprint" className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Reimprimir cuentas</h2>
              <p className="text-xs text-muted-foreground">Cuentas cobradas recientes del turno. Reimprime el recibo de cualquiera.</p>
            </div>
            {reprintPagos.length === 0 ? (
              <div className="py-16 text-center">
                <Printer className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No hay cuentas cobradas para reimprimir</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reprintPagos.map((p) => {
                  const metodos = Array.from(new Set(p.tenders.map((t) =>
                    t.metodo === "cash" ? "Efectivo" : t.metodo === "card" ? "Tarjeta" : "Depósito"))).join(" + ")
                  const hora = new Date(p.registradoEn).toLocaleString("es-GT", {
                    timeZone: "America/Guatemala", dateStyle: "short", timeStyle: "short",
                  })
                  return (
                    <Card key={p.id} className="border-border">
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">Q{p.montoTotal.toFixed(2)} · {metodos || "—"}</div>
                          <div className="text-xs text-muted-foreground truncate">{hora}{p.meseroNombre ? ` · ${p.meseroNombre}` : ""}</div>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 gap-1 shrink-0"
                          disabled={reprintingId === p.id} onClick={() => reimprimirPago(p)}>
                          <Printer className="w-3.5 h-3.5" />
                          {reprintingId === p.id ? "…" : "Reimprimir"}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ══ CORTE DE CAJA ══ */}
          <TabsContent value="cut" className="space-y-5 max-w-lg">
            <div>
              <h2 className="text-base font-semibold">Corte de caja</h2>
              <p className="text-xs text-muted-foreground">Cierre del turno del día</p>
            </div>

            {/* Resumen para el corte */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Resumen financiero del día</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between font-semibold">
                  <span>Total cobrado</span>
                  <span className="text-primary">Q{totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Órdenes del día</span>
                  <span>{totalOrders}</span>
                </div>
                <Separator />
                {apiVentasHoy?.porMetodoPago && Object.entries(apiVentasHoy.porMetodoPago).filter(([, v]) => v > 0).map(([m, v]) => (
                  <div key={m} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{m}</span>
                    <span className={paymentColor[m] ?? ""}>Q{v.toFixed(2)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span className="text-green-500">Efectivo esperado en caja</span>
                  <span className="text-green-500">Q{expectedCash.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {!cutDone ? (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4" />Conteo físico de efectivo</CardTitle>
                  <CardDescription>Ingresa el monto total de efectivo contado en caja</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label>Efectivo contado ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number" step="0.01" min="0"
                        className="pl-7 text-lg font-semibold"
                        placeholder="0.00"
                        value={cashIn}
                        onChange={e => setCashIn(e.target.value)}
                      />
                    </div>
                  </div>
                  {cashIn && cashDiff !== null && (
                    <div className={`rounded-lg p-3 text-sm font-semibold flex items-center justify-between ${cashDiff === 0 ? "bg-green-500/10 text-green-500" : cashDiff > 0 ? "bg-blue-500/10 text-blue-500" : "bg-destructive/10 text-destructive"}`}>
                      <span>{cashDiff === 0 ? "✓ Caja cuadrada" : cashDiff > 0 ? "Sobrante" : "Faltante"}</span>
                      <span>{cashDiff >= 0 ? "+" : ""}{cashDiff.toFixed(2)}</span>
                    </div>
                  )}
                  <Button className="w-full" onClick={doCorte} disabled={!cashIn}>
                    <ShieldCheck className="w-4 h-4 mr-2" />Cerrar turno y registrar corte
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="p-5 text-center space-y-3">
                  <ShieldCheck className="w-12 h-12 mx-auto text-green-500" />
                  <div>
                    <div className="font-bold text-green-500">Corte registrado</div>
                    <div className="text-xs text-muted-foreground">{cutTimestamp}</div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span>Efectivo esperado</span><span className="font-semibold">Q{expectedCash.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Efectivo contado</span><span className="font-semibold">Q{Number(cashIn).toFixed(2)}</span></div>
                    <div className={`flex justify-between font-bold ${cashDiff === 0 ? "text-green-500" : cashDiff! > 0 ? "text-blue-500" : "text-destructive"}`}>
                      <span>{cashDiff === 0 ? "Cuadre perfecto" : cashDiff! > 0 ? "Sobrante" : "Faltante"}</span>
                      <span>{cashDiff! >= 0 ? "+" : ""}{cashDiff!.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="bg-transparent" onClick={() => { setCutDone(false); setCashIn("") }}>
                    Hacer otro corte
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Recibo oculto para reimpresión (solo visible al imprimir) */}
      <ReprintReceiptView data={reprintData} />
    </div>
  )
}
