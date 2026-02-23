"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Bell,
  BellOff,
  ChefHat,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  RotateCcw,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

interface KitchenItem {
  id: string
  name: string
  quantity: number
  notes: string
  done: boolean
}

interface KitchenOrder {
  id: number
  table: number
  section: string
  items: KitchenItem[]
  status: "pending" | "preparing" | "ready"
  arrivedAt: number   // Date.now() timestamp
  startedAt?: number  // when "Iniciar" was pressed
  priority: "high" | "normal"
  isNew: boolean      // flashes briefly when just added
}

// ─── Seed data ───────────────────────────────────────────────────────────────

const now = Date.now()

const seedOrders: KitchenOrder[] = [
  { id: 1, table: 2, section: "Interior", priority: "high",  status: "pending",   arrivedAt: now - 2 * 60000,              isNew: false, items: [{ id: "a1", name: "Hamburguesa Clásica", quantity: 2, notes: "Sin cebolla",    done: false }, { id: "a2", name: "Papas Fritas",         quantity: 2, notes: "",             done: false }] },
  { id: 2, table: 5, section: "Terraza",  priority: "normal", status: "preparing", arrivedAt: now - 8 * 60000,  startedAt: now - 6 * 60000, isNew: false, items: [{ id: "b1", name: "Pizza Margarita",    quantity: 1, notes: "Extra queso",    done: false }, { id: "b2", name: "Ensalada César",       quantity: 1, notes: "",             done: true  }] },
  { id: 3, table: 7, section: "Terraza",  priority: "normal", status: "preparing", arrivedAt: now - 12 * 60000, startedAt: now - 9 * 60000, isNew: false, items: [{ id: "c1", name: "Pasta Carbonara",   quantity: 1, notes: "",             done: true  }, { id: "c2", name: "Alitas Picantes",     quantity: 1, notes: "Muy picante",  done: false }, { id: "c3", name: "Cerveza Artesanal",   quantity: 2, notes: "",             done: true  }] },
  { id: 4, table: 1, section: "Barra",    priority: "high",  status: "pending",   arrivedAt: now - 1 * 60000,              isNew: false, items: [{ id: "d1", name: "Ensalada César",   quantity: 2, notes: "",             done: false }, { id: "d2", name: "Limonada Natural",    quantity: 2, notes: "",             done: false }] },
  { id: 5, table: 4, section: "Interior", priority: "normal", status: "ready",     arrivedAt: now - 20 * 60000, startedAt: now - 18 * 60000, isNew: false, items: [{ id: "e1", name: "Tiramisú",           quantity: 1, notes: "",             done: true  }, { id: "e2", name: "Brownie con Helado",  quantity: 1, notes: "",             done: true  }] },
]

const SIMULATED_DISHES = [
  { name: "Tacos de Birria",      note: "Salsa verde aparte" },
  { name: "Enchiladas Verdes",    note: "" },
  { name: "Pozole Rojo",          note: "Extra tostadas" },
  { name: "Quesadilla de Flor",   note: "" },
  { name: "Caldo de Res",         note: "Con verduras" },
  { name: "Chiles en Nogada",     note: "" },
  { name: "Sopa de Lima",         note: "Picante" },
  { name: "Tlayuda Oaxaqueña",    note: "" },
  { name: "Agua de Jamaica",      note: "Sin azúcar" },
  { name: "Helado de Guanábana",  note: "" },
]

let nextOrderId = 10

// ─── Audio helpers ────────────────────────────────────────────────────────────

const playBeep = (times = 3) => {
  try {
    const ctx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    for (let i = 0; i < times; i++) {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = "triangle"
      osc.frequency.value = i % 2 === 0 ? 880 : 1100
      const t = ctx.currentTime + i * 0.28
      gain.gain.setValueAtTime(0.35, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
      osc.start(t)
      osc.stop(t + 0.25)
    }
  } catch { /* browser autoplay blocked; no-op */ }
}

// ─── Elapsed time helper ──────────────────────────────────────────────────────

const elapsed = (ts: number, nowMs: number) => {
  const m = Math.floor((nowMs - ts) / 60000)
  if (m < 1) return "< 1 min"
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

const elapsedColor = (ts: number, nowMs: number, status: string) => {
  if (status === "ready") return "text-green-500"
  const m = Math.floor((nowMs - ts) / 60000)
  if (m >= 15) return "text-red-500 font-bold"
  if (m >= 8)  return "text-yellow-500 font-semibold"
  return "text-muted-foreground"
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KitchenPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<KitchenOrder[]>(seedOrders)
  const [filter, setFilter] = useState<"all" | "pending" | "preparing" | "ready">("all")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [alertBanner, setAlertBanner] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(Date.now())
  const prevPendingCount = useRef(seedOrders.filter(o => o.status === "pending").length)

  // ── Live clock: updates every 30 s to refresh elapsed times ───────────────
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  // ── Auto-clear "isNew" flag after 6 s ─────────────────────────────────────
  useEffect(() => {
    const newOnes = orders.filter(o => o.isNew)
    if (newOnes.length === 0) return
    const t = setTimeout(() => {
      setOrders(prev => prev.map(o => o.isNew ? { ...o, isNew: false } : o))
    }, 6000)
    return () => clearTimeout(t)
  }, [orders])

  // ── Detect new pending orders → alert ─────────────────────────────────────
  useEffect(() => {
    const pendingCount = orders.filter(o => o.status === "pending").length
    if (pendingCount > prevPendingCount.current) {
      if (soundEnabled) playBeep(3)
      setAlertBanner("¡Nueva orden recibida!")
      const t = setTimeout(() => setAlertBanner(null), 5000)
      prevPendingCount.current = pendingCount
      return () => clearTimeout(t)
    }
    prevPendingCount.current = pendingCount
  }, [orders, soundEnabled])

  // ── Simulate a new order arriving ─────────────────────────────────────────
  const simulateNewOrder = useCallback(() => {
    const tables  = [1, 2, 3, 4, 5, 6, 7, 8]
    const sections = ["Interior", "Terraza", "Barra"]
    const qty1 = Math.floor(Math.random() * 2) + 1
    const qty2 = Math.floor(Math.random() * 2) + 1
    const dish1 = SIMULATED_DISHES[Math.floor(Math.random() * SIMULATED_DISHES.length)]
    const dish2 = SIMULATED_DISHES[Math.floor(Math.random() * SIMULATED_DISHES.length)]
    const id = nextOrderId++
    setOrders(prev => [
      ...prev,
      {
        id,
        table:    tables[Math.floor(Math.random() * tables.length)],
        section:  sections[Math.floor(Math.random() * sections.length)],
        priority: Math.random() > 0.65 ? "high" : "normal",
        status:   "pending",
        arrivedAt: Date.now(),
        isNew:    true,
        items: [
          { id: `${id}-1`, name: dish1.name, quantity: qty1, notes: dish1.note, done: false },
          { id: `${id}-2`, name: dish2.name, quantity: qty2, notes: dish2.note, done: false },
        ],
      },
    ])
    setNowMs(Date.now())
  }, [])

  // ── Order actions ──────────────────────────────────────────────────────────
  const startOrder = (id: number) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "preparing", startedAt: Date.now() } : o))

  const readyOrder = (id: number) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "ready" } : o))

  const resetOrder = (id: number) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "pending", startedAt: undefined } : o))

  const dismissOrder = (id: number) =>
    setOrders(prev => prev.filter(o => o.id !== id))

  const toggleItemDone = (orderId: number, itemId: string) =>
    setOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, items: o.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) }
        : o
    ))

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredOrders = filter === "all" ? orders : orders.filter(o => o.status === filter)
  const counts = {
    pending:   orders.filter(o => o.status === "pending").length,
    preparing: orders.filter(o => o.status === "preparing").length,
    ready:     orders.filter(o => o.status === "ready").length,
  }

  const statusBorder = (o: KitchenOrder) => {
    if (o.isNew)             return "border-blue-500 shadow-blue-500/30 shadow-md"
    if (o.priority === "high" && o.status === "pending") return "border-red-500"
    if (o.status === "pending")   return "border-red-500/40"
    if (o.status === "preparing") return "border-yellow-500/40"
    return "border-green-500/40"
  }

  const statusBadgeClass = (status: string) => {
    if (status === "pending")   return "bg-red-500/10 text-red-500 border-red-500/20"
    if (status === "preparing") return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
    return "bg-green-500/10 text-green-500 border-green-500/20"
  }

  const statusLabel = (s: string) =>
    s === "pending" ? "Pendiente" : s === "preparing" ? "Preparando" : "Listo"

  const pendingItemsDone = (o: KitchenOrder) => o.items.filter(i => i.done).length
  const allItemsDone     = (o: KitchenOrder) => o.items.every(i => i.done)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Alert banner */}
      {alertBanner && (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-500 text-white text-center py-2 text-sm font-bold animate-pulse">
          🔔 {alertBanner}
        </div>
      )}

      {/* Header */}
      <header className={`border-b border-border bg-card sticky top-0 z-10 transition-colors ${alertBanner ? "mt-8" : ""}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/")} title="Volver al panel">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <ChefHat className="w-5 h-5" />Monitor de Cocina
                </h1>
                <p className="text-xs text-muted-foreground">
                  {counts.pending} pendiente(s) · {counts.preparing} preparando · {counts.ready} listo(s)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Sound toggle */}
              <Button
                variant={soundEnabled ? "default" : "outline"}
                size="sm"
                className={!soundEnabled ? "bg-transparent" : ""}
                onClick={() => setSoundEnabled(p => !p)}
                title={soundEnabled ? "Silenciar alertas" : "Activar alertas"}
              >
                {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                <span className="ml-1 hidden sm:inline">{soundEnabled ? "Sonido ON" : "Silencio"}</span>
              </Button>
              {/* Simulate new order */}
              <Button variant="outline" size="sm" className="bg-transparent gap-1" onClick={simulateNewOrder}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Simular orden</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            { key: "all",       label: `Todos (${orders.length})` },
            { key: "pending",   label: `Pendientes (${counts.pending})` },
            { key: "preparing", label: `Preparando (${counts.preparing})` },
            { key: "ready",     label: `Listos (${counts.ready})` },
          ] as const).map(({ key, label }) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              className={filter !== key ? "bg-transparent" : ""}
              size="sm"
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Orders grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const doneCount = pendingItemsDone(order)
            const totalItems = order.items.length
            const progressPct = totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0

            return (
              <Card
                key={order.id}
                className={`border-2 transition-all ${statusBorder(order)} ${order.isNew ? "animate-pulse" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Mesa {order.table}
                        <span className="text-xs font-normal text-muted-foreground">{order.section}</span>
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {order.priority === "high" && (
                          <Badge variant="destructive" className="text-xs">Urgente</Badge>
                        )}
                        {order.isNew && (
                          <Badge className="bg-blue-500 text-white text-xs">¡Nueva!</Badge>
                        )}
                        <span className={`text-xs flex items-center gap-1 ${elapsedColor(order.arrivedAt, nowMs, order.status)}`}>
                          <Clock className="w-3 h-3" />
                          {elapsed(order.arrivedAt, nowMs)}
                        </span>
                        {order.status === "preparing" && order.startedAt && (
                          <span className="text-xs text-muted-foreground">
                            · coc. {elapsed(order.startedAt, nowMs)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className={`${statusBadgeClass(order.status)} shrink-0`}>
                      {statusLabel(order.status)}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  {order.status === "preparing" && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                        <span>Ítems listos</span>
                        <span>{doneCount}/{totalItems}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-yellow-500 transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-1.5 mb-3">
                    {order.items.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-2 p-1.5 rounded text-sm cursor-pointer hover:bg-muted/50 transition-colors ${item.done ? "opacity-50 line-through" : ""}`}
                        onClick={() => order.status === "preparing" && toggleItemDone(order.id, item.id)}
                        title={order.status === "preparing" ? "Click para marcar listo/pendiente" : undefined}
                      >
                        <div className="mt-0.5 shrink-0">
                          {item.done
                            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                            : <Circle className="w-4 h-4 text-muted-foreground" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{item.quantity}× {item.name}</span>
                          {item.notes && (
                            <p className="text-xs text-yellow-500 italic truncate">⚠ {item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="mb-3" />

                  <div className="flex gap-2">
                    {order.status === "pending" && (
                      <Button className="flex-1" size="sm" onClick={() => startOrder(order.id)}>
                        <ChefHat className="w-4 h-4 mr-1" />Iniciar
                      </Button>
                    )}
                    {order.status === "preparing" && (
                      <>
                        <Button
                          className="flex-1" size="sm"
                          disabled={!allItemsDone(order)}
                          onClick={() => readyOrder(order.id)}
                          title={!allItemsDone(order) ? "Marca todos los ítems como listos primero" : undefined}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />Listo
                        </Button>
                        <Button
                          variant="outline" size="sm" className="bg-transparent"
                          onClick={() => resetOrder(order.id)}
                          title="Regresar a pendiente"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    {order.status === "ready" && (
                      <Button
                        className="flex-1 bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20"
                        size="sm" variant="outline"
                        onClick={() => dismissOrder(order.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />Entregar y cerrar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-24">
            <ChefHat className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-40" />
            <h2 className="text-xl font-bold mb-1">Sin pedidos</h2>
            <p className="text-sm text-muted-foreground mb-4">Los nuevos pedidos aparecerán aquí automáticamente</p>
            <Button variant="outline" size="sm" className="bg-transparent gap-1" onClick={simulateNewOrder}>
              <Plus className="w-4 h-4" />Simular primera orden
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
