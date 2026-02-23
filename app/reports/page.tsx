"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  Search,
  ChevronDown,
  ChevronUp,
  Printer,
  CalendarDays,
  CircleDollarSign,
  Star,
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

const paymentColor: Record<PaymentMethod, string> = {
  Efectivo: "text-green-500",
  "Tarjeta Débito": "text-blue-500",
  "Tarjeta Crédito": "text-purple-500",
  "Transferencia": "text-orange-500",
}
const paymentBadgeVariant = (m: PaymentMethod): "default" | "secondary" | "outline" => {
  if (m === "Efectivo") return "default"
  if (m === "Tarjeta Crédito" || m === "Tarjeta Débito") return "secondary"
  return "outline"
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ username: string; module: string } | null>(null)

  useEffect(() => {
    const sessionStr = localStorage.getItem("module_session_reports")
    if (!sessionStr) { router.push("/reports/login"); return }
    setUser(JSON.parse(sessionStr))
  }, [router])

  const logout = () => {
    localStorage.removeItem("module_session_reports")
    router.push("/reports/login")
  }

  const [activeTab, setActiveTab] = useState("summary")

  // ── Period filter ──────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<"today" | "week" | "month" | "range">("today")
  const [rangeFrom, setRangeFrom] = useState("")
  const [rangeTo, setRangeTo] = useState("")

  const today = new Date()
  const filteredByPeriod = useMemo(() => {
    return seedTickets.filter(t => {
      const d = new Date(t.date)
      if (period === "today") return isSameDay(t.date, today)
      if (period === "week") {
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6); weekAgo.setHours(0, 0, 0, 0)
        return d >= weekAgo
      }
      if (period === "month") {
        const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 29); monthAgo.setHours(0, 0, 0, 0)
        return d >= monthAgo
      }
      if (period === "range" && rangeFrom && rangeTo) {
        const from = new Date(rangeFrom + "T00:00:00"); const to = new Date(rangeTo + "T23:59:59")
        return d >= from && d <= to
      }
      return true
    })
  }, [period, rangeFrom, rangeTo])

  const todayTickets = useMemo(() => seedTickets.filter(t => isSameDay(t.date, today)), [])

  // ── Summary KPIs ────────────────────────────────────────────────────────────
  const totalSales = useMemo(() => todayTickets.reduce((s, t) => s + t.total, 0), [todayTickets])
  const totalTip = useMemo(() => todayTickets.reduce((s, t) => s + t.tip, 0), [todayTickets])
  const totalDiscount = useMemo(() => todayTickets.reduce((s, t) => s + t.discount, 0), [todayTickets])
  const avgTicket = todayTickets.length ? totalSales / todayTickets.length : 0
  const cashTotal = useMemo(() => todayTickets.filter(t => t.paymentMethod === "Efectivo").reduce((s, t) => s + t.total, 0), [todayTickets])
  const cashTipTotal = useMemo(() => todayTickets.filter(t => t.tipMethod === "Efectivo").reduce((s, t) => s + t.tip, 0), [todayTickets])

  const paymentBreakdown = useMemo(() => {
    const methods: PaymentMethod[] = ["Efectivo", "Tarjeta Débito", "Tarjeta Crédito", "Transferencia"]
    return methods.map(m => ({
      method: m,
      count: todayTickets.filter(t => t.paymentMethod === m).length,
      total: todayTickets.filter(t => t.paymentMethod === m).reduce((s, t) => s + t.total, 0),
    })).filter(x => x.count > 0)
  }, [todayTickets])

  // ── Sales by day (for chart) ────────────────────────────────────────────────
  const salesByDay = useMemo(() => {
    const days: { label: string; total: number; date: string }[] = []
    const count = period === "today" ? 1 : period === "week" ? 7 : 30
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      const dayTickets = filteredByPeriod.filter(t => isSameDay(t.date, d))
      const label = period === "month"
        ? d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" })
        : d.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit" })
      days.push({ label, total: dayTickets.reduce((s, t) => s + t.total, 0), date: d.toISOString() })
    }
    return days
  }, [filteredByPeriod, period])

  const maxDayTotal = Math.max(...salesByDay.map(d => d.total), 1)

  // ── Products ranking ────────────────────────────────────────────────────────
  const [productView, setProductView] = useState<"all" | "category">("all")
  const productRanking = useMemo(() => {
    const map = new Map<string, { name: string; category: string; qty: number; revenue: number }>()
    filteredByPeriod.forEach(t => t.items.forEach(item => {
      const key = item.name
      const prev = map.get(key) || { name: item.name, category: item.category, qty: 0, revenue: 0 }
      map.set(key, { ...prev, qty: prev.qty + item.qty, revenue: prev.revenue + item.unitPrice * item.qty })
    }))
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty)
  }, [filteredByPeriod])

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
    const waiters = Array.from(new Set(filteredByPeriod.map(t => t.waiter)))
    return waiters.map(w => {
      const wTickets = filteredByPeriod.filter(t => t.waiter === w)
      const total = wTickets.reduce((s, t) => s + t.total, 0)
      const tip = wTickets.reduce((s, t) => s + t.tip, 0)
      return { name: w, tickets: wTickets.length, total, tip, avg: wTickets.length ? total / wTickets.length : 0 }
    }).sort((a, b) => b.total - a.total)
  }, [filteredByPeriod])

  // ── History filters ─────────────────────────────────────────────────────────
  const [histSearch, setHistSearch] = useState("")
  const [histUser, setHistUser] = useState("all")
  const [histMethod, setHistMethod] = useState("all")
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null)
  const allWaiters = Array.from(new Set(seedTickets.map(t => t.waiter))).sort()
  const allMethods: PaymentMethod[] = ["Efectivo", "Tarjeta Débito", "Tarjeta Crédito", "Transferencia"]

  const historyTickets = useMemo(() => {
    return [...filteredByPeriod]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(t =>
        (histUser === "all" || t.waiter === histUser) &&
        (histMethod === "all" || t.paymentMethod === histMethod) &&
        (histSearch === "" || t.id.includes(histSearch.toUpperCase()) || t.tableNumber.toString().includes(histSearch))
      )
  }, [filteredByPeriod, histUser, histMethod, histSearch])

  // ── Corte de caja ───────────────────────────────────────────────────────────
  const [cashIn, setCashIn] = useState("")
  const [cutDone, setCutDone] = useState(false)
  const [cutTimestamp, setCutTimestamp] = useState("")

  const expectedCash = useMemo(() =>
    todayTickets.filter(t => t.paymentMethod === "Efectivo").reduce((s, t) => s + t.total, 0),
    [todayTickets]
  )
  const cashDiff = cashIn ? Number(cashIn) - expectedCash : null

  const doCorte = () => {
    if (!cashIn) { toast({ title: "Ingresa el efectivo contado antes de cerrar" }); return }
    setCutTimestamp(new Date().toLocaleString("es-MX"))
    setCutDone(true)
    toast({ title: "Corte de caja registrado", description: `${new Date().toLocaleString("es-MX")}` })
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
      <span className="text-xs text-muted-foreground">{filteredByPeriod.length} tickets</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
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

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="summary"><BarChart3 className="w-4 h-4 mr-1 hidden sm:inline" />Resumen</TabsTrigger>
            <TabsTrigger value="sales"><TrendingUp className="w-4 h-4 mr-1 hidden sm:inline" />Ventas</TabsTrigger>
            <TabsTrigger value="products"><UtensilsCrossed className="w-4 h-4 mr-1 hidden sm:inline" />Platillos</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-1 hidden sm:inline" />Meseros</TabsTrigger>
            <TabsTrigger value="history"><Receipt className="w-4 h-4 mr-1 hidden sm:inline" />Historial</TabsTrigger>
            <TabsTrigger value="cut"><ShieldCheck className="w-4 h-4 mr-1 hidden sm:inline" />Corte</TabsTrigger>
          </TabsList>

          {/* ══ RESUMEN DEL DÍA ══ */}
          <TabsContent value="summary" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Resumen de hoy</h2>
              <Badge variant="outline" className="gap-1"><CalendarDays className="w-3 h-3" />{toDateStr(today.toISOString())}</Badge>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Ventas del día</div>
                    <div className="text-2xl font-bold text-primary">${totalSales.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{todayTickets.length} tickets</div>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2 mt-0.5 shrink-0"><TrendingUp className="w-5 h-5 text-primary" /></div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Efectivo en caja</div>
                    <div className="text-2xl font-bold text-green-500">${cashTotal.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Incl. propina efectivo</div>
                  </div>
                  <div className="rounded-lg bg-green-500/10 p-2 mt-0.5 shrink-0"><Wallet className="w-5 h-5 text-green-500" /></div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Propinas del día</div>
                    <div className="text-2xl font-bold text-yellow-500">${totalTip.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">En efectivo: ${cashTipTotal.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-yellow-500/10 p-2 mt-0.5 shrink-0"><Star className="w-5 h-5 text-yellow-500" /></div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Promedio / ticket</div>
                    <div className="text-2xl font-bold">${avgTicket.toFixed(2)}</div>
                    {totalDiscount > 0 && <div className="text-xs text-destructive">Descuentos: -${totalDiscount.toFixed(2)}</div>}
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
                          <span className="text-xs text-muted-foreground">{pb.count} tickets</span>
                        </div>
                        <span className={`font-semibold text-sm ${paymentColor[pb.method]}`}>${pb.total.toFixed(2)}</span>
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
            {todayTickets.length > 0 && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />Top platillos del día</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(() => {
                      const map = new Map<string, { name: string; qty: number; revenue: number }>()
                      todayTickets.forEach(t => t.items.forEach(item => {
                        const prev = map.get(item.name) || { name: item.name, qty: 0, revenue: 0 }
                        map.set(item.name, { ...prev, qty: prev.qty + item.qty, revenue: prev.revenue + item.unitPrice * item.qty })
                      }))
                      return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 3).map((p, i) => (
                        <div key={p.name} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
                          <div className={`text-lg font-black w-6 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : "text-amber-600"}`}>{i + 1}</div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.qty} unidades</div>
                          </div>
                          <div className="text-sm font-semibold text-primary">${p.revenue.toFixed(2)}</div>
                        </div>
                      ))
                    })()}
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
                { label: "Total vendido", value: `$${filteredByPeriod.reduce((s, t) => s + t.total, 0).toFixed(2)}`, color: "text-primary" },
                { label: "Tickets", value: filteredByPeriod.length.toString(), color: "" },
                { label: "Propinas", value: `$${filteredByPeriod.reduce((s, t) => s + t.tip, 0).toFixed(2)}`, color: "text-yellow-500" },
                { label: "Descuentos", value: `-$${filteredByPeriod.reduce((s, t) => s + t.discount, 0).toFixed(2)}`, color: "text-destructive" },
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
                  Máximo del periodo: ${Math.max(...salesByDay.map(d => d.total), 0).toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-40 w-full overflow-x-auto pb-1">
                  {salesByDay.map(d => (
                    <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-[28px] group">
                      <div className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ${d.total.toFixed(0)}
                      </div>
                      <div
                        className="w-full rounded-sm bg-primary/80 hover:bg-primary transition-colors cursor-default min-h-[2px]"
                        style={{ height: `${Math.max((d.total / maxDayTotal) * 120, d.total > 0 ? 4 : 2)}px` }}
                        title={`${d.label}: $${d.total.toFixed(2)}`}
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
                {allMethods.map(m => {
                  const mTickets = filteredByPeriod.filter(t => t.paymentMethod === m)
                  const mTotal = mTickets.reduce((s, t) => s + t.total, 0)
                  const periodTotal = filteredByPeriod.reduce((s, t) => s + t.total, 0)
                  if (mTotal === 0) return null
                  return (
                    <div key={m} className="flex items-center gap-3">
                      <Badge variant={paymentBadgeVariant(m)} className="text-xs w-32 justify-center shrink-0">{m}</Badge>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(mTotal / periodTotal) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold w-20 text-right">${mTotal.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground w-8">{mTickets.length}t</span>
                    </div>
                  )
                })}
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
                                  <div className="text-sm font-semibold text-primary">${p.revenue.toFixed(2)}</div>
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
                          <span className="font-semibold text-sm text-primary">${cat.revenue.toFixed(2)}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="space-y-1">
                          {catItems.map(item => (
                            <div key={item.name} className="flex items-center justify-between text-xs text-muted-foreground pl-4">
                              <span>{item.name}</span>
                              <span>{item.qty} uds · ${item.revenue.toFixed(2)}</span>
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
                                <div className="text-xs text-muted-foreground">{u.tickets} tickets · Promedio ${u.avg.toFixed(2)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-primary">${u.total.toFixed(2)}</div>
                                <div className="text-xs text-yellow-500">Propinas: ${u.tip.toFixed(2)}</div>
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

            {/* Tip breakdown */}
            {filteredByPeriod.length > 0 && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />Propinas por método de pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(["Efectivo", "Tarjeta Débito", "Tarjeta Crédito", "Transferencia"] as PaymentMethod[]).map(m => {
                    const tipTotal = filteredByPeriod.filter(t => t.tipMethod === m).reduce((s, t) => s + t.tip, 0)
                    if (tipTotal === 0) return null
                    const allTips = filteredByPeriod.reduce((s, t) => s + t.tip, 0)
                    return (
                      <div key={m} className="flex items-center gap-3">
                        <Badge variant={paymentBadgeVariant(m)} className="text-xs w-32 justify-center shrink-0">{m}</Badge>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-yellow-500/80" style={{ width: `${(tipTotal / allTips) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold w-20 text-right text-yellow-500">${tipTotal.toFixed(2)}</span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══ HISTORIAL ══ */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-semibold">Historial de cuentas</h2>
              <PeriodSelector />
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-40 max-w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Mesa o # ticket..." className="pl-8 h-8 text-sm" value={histSearch} onChange={e => setHistSearch(e.target.value)} />
                </div>
                <Select value={histUser} onValueChange={setHistUser}>
                  <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meseros</SelectItem>
                    {allWaiters.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={histMethod} onValueChange={setHistMethod}>
                  <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los métodos</SelectItem>
                    {allMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">{historyTickets.length} resultados · Total: ${historyTickets.reduce((s, t) => s + t.total, 0).toFixed(2)}</p>
            </div>

            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2 pr-1">
                {historyTickets.length === 0
                  ? <p className="text-sm text-muted-foreground py-8 text-center">Sin resultados</p>
                  : historyTickets.map(t => {
                    const isExpanded = expandedTicketId === t.id
                    return (
                      <Card key={t.id} className="border-border">
                        <CardContent className="p-0">
                          <div
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 rounded-lg transition-colors"
                            onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <code className="text-xs font-bold">{t.id}</code>
                                <span className="text-xs text-muted-foreground">Mesa {t.tableNumber}</span>
                                <span className="text-xs text-muted-foreground">{t.waiter}</span>
                                <Badge variant={paymentBadgeVariant(t.paymentMethod)} className="text-xs">{t.paymentMethod}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {toDateStr(t.date)} {toTimeStr(t.date)} · {t.items.reduce((s, i) => s + i.qty, 0)} artículos
                                {t.tip > 0 && <span className="text-yellow-500 ml-1">· Propina: ${t.tip.toFixed(2)}</span>}
                                {t.discount > 0 && <span className="text-destructive ml-1">· Desc: -${t.discount.toFixed(2)}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-base font-bold text-primary">${t.total.toFixed(2)}</div>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-border px-4 pb-3 pt-2 space-y-1.5">
                              {t.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{item.qty}× {item.name}</span>
                                  <span>${(item.unitPrice * item.qty).toFixed(2)}</span>
                                </div>
                              ))}
                              <Separator className="my-1" />
                              <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                                <span>Subtotal: ${t.subtotal.toFixed(2)}</span>
                                <span>IVA: ${t.tax.toFixed(2)}</span>
                                {t.discount > 0 && <span className="text-destructive">Descuento: -${t.discount.toFixed(2)}</span>}
                                <span className="text-yellow-500">Propina ({t.tipMethod}): ${t.tip.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between font-semibold text-sm pt-0.5">
                                <span>Total cobrado</span>
                                <span className="text-primary">${t.total.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-end pt-1">
                                <Button size="sm" variant="outline" className="h-7 bg-transparent text-xs gap-1" onClick={() => toast({ title: "Reimprimiendo ticket", description: t.id })}>
                                  <Printer className="w-3 h-3" />Reimprimir
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </ScrollArea>
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ventas</span>
                  <span>${todayTickets.reduce((s, t) => s + t.subtotal, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA (16%)</span>
                  <span>${todayTickets.reduce((s, t) => s + t.tax, 0).toFixed(2)}</span>
                </div>
                {todayTickets.reduce((s, t) => s + t.discount, 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Descuentos aplicados</span>
                    <span className="text-destructive">-${todayTickets.reduce((s, t) => s + t.discount, 0).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total cobrado</span>
                  <span className="text-primary">${totalSales.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Propinas en efectivo</span>
                  <span className="text-yellow-500">${cashTipTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Propinas con tarjeta/transferencia</span>
                  <span className="text-yellow-500">${(totalTip - cashTipTotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total propinas</span>
                  <span className="text-yellow-500">${totalTip.toFixed(2)}</span>
                </div>
                <Separator />
                {allMethods.map(m => {
                  const mTotal = todayTickets.filter(t => t.paymentMethod === m).reduce((s, t) => s + t.total, 0)
                  if (mTotal === 0) return null
                  return (
                    <div key={m} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{m}</span>
                      <span className={paymentColor[m]}>${mTotal.toFixed(2)}</span>
                    </div>
                  )
                })}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span className="text-green-500">Efectivo esperado en caja</span>
                  <span className="text-green-500">${expectedCash.toFixed(2)}</span>
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
                    <div className="flex justify-between"><span>Efectivo esperado</span><span className="font-semibold">${expectedCash.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Efectivo contado</span><span className="font-semibold">${Number(cashIn).toFixed(2)}</span></div>
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
    </div>
  )
}
