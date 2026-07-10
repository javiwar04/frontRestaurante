"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  getSession, clearSession, clearActiveEstablecimiento,
  secciones as seccionesApi,
  platillos as platillosApi,
  turnos, ordenes, pagos, facturas, auditoria, cortesInventario,
  config,
  type Turno, type Orden, type Pago, type CreateOrdenItemRequest, type PreconteoItem,
} from "@/lib/api"
import { connectRealtime } from "@/lib/realtime"
import { FACTURACION_HABILITADA } from "@/lib/features"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft, Users, Clock, Plus, Minus, Trash2, Search, ShoppingCart,
  CreditCard, DollarSign, FileText, BarChart3, LogOut, ClipboardList,
  RefreshCw, ChefHat, UtensilsCrossed, Receipt, Printer,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

import {
  MAX_ACCOUNTS_PER_TABLE, getModifiersPrice,
  type OrderItem, type MenuItem, type Payment, type Invoice, type ShiftReport,
  type Role, type AuditEntry, type TableAccount, type SectorTableStatus,
  type TableOrderEstado, type SectorTable, type Sector, type PaymentTenderDraft,
  type ModifierOption, type ModifierGroup, type Waiter,
  type PrintTicketData, type PrintReportData, type NegocioInfo,
} from "./types"
import { saveShiftData, loadShiftData, clearShiftData } from "./shift-storage"
import { PrintTicketView, PrintReportView } from "./print-views"

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function POSPage() {
  const router = useRouter()

  // ─── Session & User ────────────────────────────────────────────────────────
  const [sessionReady, setSessionReady] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: Role }>({
    id: "", name: "", role: "cajero",
  })

  // ─── Mode / Navigation ─────────────────────────────────────────────────────
  // cash-open → tables → order
  const [mode, setMode] = useState<"cash-open" | "tables" | "order">("cash-open")

  // ─── Cash / Turno ──────────────────────────────────────────────────────────
  const [cashOpen, setCashOpen] = useState(false)
  const [currentTurno, setCurrentTurno] = useState<Turno | null>(null)
  const [initialCash, setInitialCash] = useState(0)
  const [currentCash, setCurrentCash] = useState(0)
  const [showCashClose, setShowCashClose] = useState(false)
  const [showCashMove, setShowCashMove] = useState(false)
  const [cashMoveType, setCashMoveType] = useState<"entrada" | "retiro">("entrada")
  const [cashMoveAmount, setCashMoveAmount] = useState(0)
  const [cashMoveReason, setCashMoveReason] = useState("")
  const [physicalCount, setPhysicalCount] = useState(0)
  const [cashOpenLoading, setCashOpenLoading] = useState(false)

  // ─── Corte de inventario (obligatorio al cerrar turno) ──────────────────────
  type ConteoRow = PreconteoItem & { encontreStr: string; ingresoStr: string; quedoStr: string }
  const [showInventoryCount, setShowInventoryCount] = useState(false)
  const [conteoItems, setConteoItems] = useState<ConteoRow[]>([])
  const [conteoLoading, setConteoLoading] = useState(false)
  const [conteoSaving, setConteoSaving] = useState(false)

  // ─── Shift report ──────────────────────────────────────────────────────────
  const [currentShift, setCurrentShift] = useState<ShiftReport>({
    shiftId: "", userId: "", userName: "", startTime: new Date(),
    totalSales: 0, totalOrders: 0,
    paymentMethods: { cash: 0, card: 0, transfer: 0 },
    productsUsed: {},
  })

  // ─── Sectors & Tables ──────────────────────────────────────────────────────
  const [sectors, setSectors] = useState<Sector[]>([])
  const [selectedSectorId, setSelectedSectorId] = useState<string>("")
  const allSectorTables = useMemo(() => sectors.flatMap((s) => s.tables), [sectors])

  // ─── Table selection & accounts ────────────────────────────────────────────
  const [selectedTable, setSelectedTable] = useState<{ id: string; number: number; label: string; seats: number } | null>(null)
  const [accountsByTable, setAccountsByTable] = useState<Record<string, TableAccount[]>>({})
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const isHydratingRef = useRef(false)
  const recentlyPaidOrderIds = useRef<Set<string>>(new Set())
  const skipNextReloadRef = useRef(false)
  const shiftHydratedRef = useRef(false)

  // ─── Order state ───────────────────────────────────────────────────────────
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([])
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderStartTime, setOrderStartTime] = useState<Date | null>(null)
  const [diners, setDiners] = useState(1)
  const [serviceType, setServiceType] = useState<"mesa" | "para_llevar" | "domicilio">("mesa")
  const [orderStatus, setOrderStatus] = useState<"pendiente" | "en_cocina" | "lista" | "pagado">("pendiente")
  const [discountAmount, setDiscountAmount] = useState(0)

  // Propina: monto que se cobra ADEMÁS del total (no se le aplica IVA).
  // Se captura en el diálogo de pago; el backend la persiste en la orden.
  const [tipAmount, setTipAmount] = useState(0)
  const [suggestedTipPct, setSuggestedTipPct] = useState(10)
  const [tipEnabled, setTipEnabled] = useState(true)   // propina activa según config de la sucursal

  // Tasa de IVA — se carga desde /config/impuestos para coincidir con el backend
  const [TAX_RATE, setTaxRate] = useState(0.12)

  // ─── Menu ──────────────────────────────────────────────────────────────────
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState("Todos")
  const [searchQuery, setSearchQuery] = useState("")
  const [modifiersByItemId, setModifiersByItemId] = useState<Record<string, ModifierGroup[]>>({})

  // ─── Recipes & Inventory (from backend) ────────────────────────────────────


  // ─── Waiters ───────────────────────────────────────────────────────────────
  const [waiters, setWaiters] = useState<Waiter[]>([])
  const [tableWaiter, setTableWaiter] = useState<Record<string, string>>({})
  const [showAssignWaiter, setShowAssignWaiter] = useState(false)
  const [pendingAreaTable, setPendingAreaTable] = useState<SectorTable | null>(null)
  const [selectedWaiterId, setSelectedWaiterId] = useState("")

  // ─── Payments & Invoices ───────────────────────────────────────────────────
  const [payments, setPayments] = useState<Payment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null)
  const [paymentTendersDraft, setPaymentTendersDraft] = useState<PaymentTenderDraft[]>([])

  // ─── Dialog visibility ─────────────────────────────────────────────────────
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [showDiscountDialog, setShowDiscountDialog] = useState(false)
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [showModifiersDialog, setShowModifiersDialog] = useState(false)
  const [showReportsDialog, setShowReportsDialog] = useState(false)
  const [showShiftDialog, setShowShiftDialog] = useState(false)
  const [showBillingDialog, setShowBillingDialog] = useState(false)

  // ─── Modifiers dialog state ────────────────────────────────────────────────
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null)
  const [pendingModifiers, setPendingModifiers] = useState<Record<string, string | string[]>>({})
  const [pendingNotes, setPendingNotes] = useState("")

  // ─── Supervisor PIN ────────────────────────────────────────────────────────
  const [showSupervisorDialog, setShowSupervisorDialog] = useState(false)
  const [supervisorPinInput, setSupervisorPinInput] = useState("")
  const [supervisorActionLabel, setSupervisorActionLabel] = useState("")
  const [pendingSupervisorAction, setPendingSupervisorAction] = useState<(() => void) | null>(null)
  const [supervisorError, setSupervisorError] = useState("")
  const [supervisorLoading, setSupervisorLoading] = useState(false)

  // ─── Split bill ────────────────────────────────────────────────────────────
  const [splitPeople, setSplitPeople] = useState(2)
  const [splitMode, setSplitMode] = useState<"equal" | "byItem">("equal")
  const [splitPayMethods, setSplitPayMethods] = useState<Record<number, "cash" | "card" | "transfer">>({})
  const [splitPaid, setSplitPaid] = useState<Record<number, boolean>>({})
  const [splitAssignments, setSplitAssignments] = useState<Record<string, number | "all">>({})

  // ─── Transfer ──────────────────────────────────────────────────────────────
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null)
  const [transferQtyByIndex, setTransferQtyByIndex] = useState<Record<number, number>>({})

  // ─── Audit ─────────────────────────────────────────────────────────────────
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])

  // ─── Print ticket / report ─────────────────────────────────────────────────
  const [printTicket, setPrintTicket] = useState<PrintTicketData | null>(null)
  const [printReport, setPrintReport] = useState<PrintReportData | null>(null)

  // Datos del negocio para el encabezado del ticket (de /config/negocio)
  const [negocio, setNegocio] = useState<NegocioInfo>({ nombre: "Restaurante" })

  const triggerPrintTicket = (ticket: PrintTicketData) => {
    setPrintReport(null)
    setPrintTicket(ticket)
    setTimeout(() => { if (typeof window !== "undefined") window.print() }, 150)
  }

  const triggerPrintReport = (title: string, lines: string[]) => {
    setPrintTicket(null)
    setPrintReport({ title, lines })
    setTimeout(() => { if (typeof window !== "undefined") window.print() }, 150)
  }

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintReport(null)
      setPrintTicket(null)
    }
    if (typeof window !== "undefined") {
      window.addEventListener("afterprint", handleAfterPrint)
      return () => window.removeEventListener("afterprint", handleAfterPrint)
    }
  }, [])

  // ─── Invoice form state ────────────────────────────────────────────────────
  const [invoiceCustomerName, setInvoiceCustomerName] = useState("")
  const [invoiceCustomerRFC, setInvoiceCustomerRFC] = useState("")

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS — Data loading
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. Session check
  useEffect(() => {
    const session = getSession("pos")
    if (!session) { router.replace("/pos/login"); return }
    const role: Role = (session.user.rol as Role) || "cajero"
    setCurrentUser({ id: session.user.id, name: session.user.nombre, role })
    setCurrentShift((prev) => ({ ...prev, userId: session.user.id, userName: session.user.username }))
    setSessionReady(true)
  }, [router])

  // 2. Check active turno → decide initial mode + hydrate shift FROM BACKEND
  //    Las ventas del turno (pagos, facturado, métodos) son autoritativas del
  //    backend, así que el resumen sobrevive refrescos y cambios de máquina.
  //    localStorage queda solo como caché que enriquece con detalle local
  //    (ítems del ticket, movimientos de caja, etc.) en la misma estación.
  useEffect(() => {
    if (!sessionReady) return
    let cancelled = false
    const methodMap: Record<string, "cash" | "card" | "transfer"> = {
      cash: "cash", card: "card", transfer: "transfer",
      efectivo: "cash", tarjeta: "card", transferencia: "transfer",
    }
    ;(async () => {
      let t: Turno | null = null
      try { t = await turnos.getActivo("pos") } catch { /* sin turno */ }
      if (cancelled) return
      if (!t) { shiftHydratedRef.current = true; setMode("cash-open"); return }

      setCurrentTurno(t)
      setCashOpen(true)
      setInitialCash(t.efectivoInicial ?? 0)
      setMode("tables")

      const saved = loadShiftData()
      const sameTurno = !!saved && saved.turnoId === t.id

      // Pagos del turno desde el backend (fuente de verdad)
      let backendPagos: Pago[] = []
      try { backendPagos = (await pagos.getAll("pos")).filter((p) => p.turnoId === t!.id) }
      catch { /* si falla, caemos al caché local abajo */ }
      if (cancelled) return

      if (backendPagos.length > 0) {
        // Indexar caché local por id de pago del backend para recuperar detalle
        const localByBackendId = new Map<string, Payment>()
        if (sameTurno) saved!.payments.forEach((p) => { if (p.backendPagoId) localByBackendId.set(p.backendPagoId, p) })

        const rebuilt: Payment[] = backendPagos
          .slice()
          .sort((a, b) => new Date(a.registradoEn).getTime() - new Date(b.registradoEn).getTime())
          .map((bp) => {
            const local = localByBackendId.get(bp.id)
            const tenders = (bp.tenders || []).map((tn, i) => ({
              id: `td-${bp.id}-${i}`, method: methodMap[tn.metodo] ?? "cash", amount: tn.monto,
            }))
            return {
              id: local?.id ?? `PAY-${bp.id}`,
              backendPagoId: bp.id,
              orderId: bp.ordenId,
              tableNumber: local?.tableNumber ?? "-",
              amount: bp.montoTotal,
              tenders: local?.tenders ?? tenders,
              timestamp: new Date(bp.registradoEn),
              userId: bp.meseroId ?? local?.userId ?? "",
              userName: bp.meseroNombre ?? local?.userName ?? "",
              invoiced: bp.facturado,
              items: local?.items ?? [],
              waiterId: local?.waiterId,
              waiterName: local?.waiterName ?? bp.meseroNombre ?? undefined,
              discountAmount: local?.discountAmount ?? 0,
              tipAmount: local?.tipAmount,
            }
          })

        const paymentMethods = { cash: 0, card: 0, transfer: 0 }
        backendPagos.forEach((bp) => (bp.tenders || []).forEach((tn) => {
          paymentMethods[methodMap[tn.metodo] ?? "cash"] += tn.monto
        }))
        const totalSales = backendPagos.reduce((s, bp) => s + bp.montoTotal, 0)
        const cashSales = paymentMethods.cash

        setPayments(rebuilt)
        setCurrentShift((prev) => ({
          ...prev,
          shiftId: t!.id,
          totalSales,
          totalOrders: backendPagos.length,
          paymentMethods,
          // productsUsed solo lo tiene el caché de la estación original
          productsUsed: sameTurno ? saved!.shiftReport.productsUsed : {},
        }))
        // currentCash: el backend ya calcula efectivoEnCaja (inicial + ventas
        // efectivo + entradas - retiros), autoritativo y con movimientos incluidos
        setCurrentCash(t.efectivoEnCaja ?? (t.efectivoInicial ?? 0) + cashSales)
        setInvoices(sameTurno ? (saved!.invoices || []) : [])
        setAuditLog(sameTurno ? saved!.auditLog : [])
      } else if (sameTurno) {
        // Sin pagos en backend pero hay caché de este turno (p.ej. turno recién abierto)
        setCurrentShift((prev) => ({ ...saved!.shiftReport, userId: prev.userId, userName: prev.userName }))
        setPayments(saved!.payments)
        setAuditLog(saved!.auditLog)
        setCurrentCash(t.efectivoEnCaja ?? saved!.currentCash)
        setInvoices(saved!.invoices || [])
      } else {
        setCurrentCash(t.efectivoEnCaja ?? t.efectivoInicial ?? 0)
      }
      shiftHydratedRef.current = true
    })()
    return () => { cancelled = true }
  }, [sessionReady])

  // 2b. Auto-save shift data to localStorage whenever it changes
  useEffect(() => {
    if (!shiftHydratedRef.current || !currentTurno?.id) return
    saveShiftData({
      shiftReport: currentShift,
      payments,
      auditLog,
      currentCash,
      invoices,
      turnoId: currentTurno.id,
    })
  }, [currentShift, payments, auditLog, currentCash, invoices, currentTurno])

  // 3. Load sectors + restore active orders → derive table statuses
  const loadSectorsAndOrders = useCallback(() => {
    if (!sessionReady || !cashOpen) return
    Promise.all([
      seccionesApi.getAll("pos"),
      ordenes.getAll("pos").catch(() => [] as Orden[]),
    ]).then(([apiSecs, apiOrdenes]) => {
      const activeOrdenes = apiOrdenes.filter((o) => !(["pagada","pagado","cancelada","cancelado"] as string[]).includes(o.estado) && !recentlyPaidOrderIds.current.has(o.id))

      // Prune recentlyPaidOrderIds: remove IDs that backend already shows as pagada/cancelled or gone
      const backendActiveIds = new Set(apiOrdenes.filter((o) => !(["pagada","pagado","cancelada","cancelado"] as string[]).includes(o.estado)).map((o) => o.id))
      recentlyPaidOrderIds.current.forEach((id) => {
        if (!backendActiveIds.has(id)) recentlyPaidOrderIds.current.delete(id)
      })

      // Map of mesaId → order estado (lista takes priority)
      const tableEstados: Record<string, TableOrderEstado> = {}
      const occupiedIds = new Set<string>()
      activeOrdenes.forEach((o) => {
        if (!o.mesaId) return
        occupiedIds.add(o.mesaId)
        // "servido" = cocina marcó la orden lista (nombre que usa el backend)
        if (o.estado === "lista" || o.estado === "servido") tableEstados[o.mesaId] = "lista"
        else if (!tableEstados[o.mesaId]) tableEstados[o.mesaId] = "en_cocina"
      })

      const mapped: Sector[] = apiSecs.map((s) => ({
        id: String(s.id),
        name: s.nombre,
        tables: s.mesas.map((m) => ({
          id: m.id,
          number: m.numero,
          label: m.etiqueta || String(m.numero),
          seats: m.capacidad,
          status: (occupiedIds.has(m.id) ? "occupied" : "available") as SectorTableStatus,
          orderEstado: tableEstados[m.id] || null,
        })),
      }))
      if (mapped.length === 0) return
      setSectors(mapped)
      if (!selectedSectorId || !mapped.find((s) => s.id === selectedSectorId)) {
        setSelectedSectorId(mapped[0].id)
      }

      // Restore accounts from active orders
      const restoredAccounts: Record<string, TableAccount[]> = {}
      activeOrdenes.forEach((o) => {
        if (!o.mesaId) return
        const items: OrderItem[] = o.items.map((i) => ({
          id: i.platilloId,
          backendItemId: Number(i.id),
          name: i.platilloNombre || i.nombre || i.platilloId,
          price: i.precioUnitario,
          quantity: i.cantidad,
          category: "",
          modifiers: (i.modificadores || []).map((m) => ({
            group: m.grupoNombre || "Extra",
            option: m.opcionNombre || "Opción",
            priceDelta: Number(m.precioDelta || 0),
            ...(m.opcionId ? { opcionId: m.opcionId } : {}),
          })),
          notes: i.notas ?? undefined,
          sent: true,
          status: i.estado === "listo" ? "listo" : i.estado === "entregado" ? "entregado" : "en_cocina",
        }))
        const account: TableAccount = {
          id: `ACC-restored-${o.id}`,
          label: "Cuenta 1",
          orderId: `TCK-${o.id}`,
          backendOrdenId: o.id,
          startTime: new Date(o.creadoEn).getTime(),
          diners: 1,
          serviceType: o.tipoServicio === "delivery" ? "domicilio" : (o.tipoServicio as "mesa" | "para_llevar"),
          // Toda orden activa en backend ya fue enviada — "pendiente" aquí solo
          // significa que cocina aún no la inicia
          status: (o.estado === "lista" || o.estado === "servido") ? "lista" : "en_cocina",
          discountAmount: 0,
          items,
        }
        restoredAccounts[o.mesaId] = [...(restoredAccounts[o.mesaId] ?? []), account]
      })
      // Always sync accountsByTable from backend (replace stale local data)
      setAccountsByTable((prev) => {
        const next: Record<string, TableAccount[]> = {}
        // Keep local accounts only for tables NOT present in backend
        // (i.e., tables with only unsent local items that haven't been POSTed yet)
        for (const [tableId, localAccounts] of Object.entries(prev)) {
          const hasUnsentOnly = localAccounts.some((a) => a.status === "pendiente" && !a.backendOrdenId && a.items.some((i) => !i.sent))
          if (hasUnsentOnly && !restoredAccounts[tableId]) {
            next[tableId] = localAccounts
          }
        }
        // Merge in backend accounts
        for (const [tableId, accounts] of Object.entries(restoredAccounts)) {
          next[tableId] = accounts
        }
        return next
      })
    }).catch(() => {})
  }, [sessionReady, cashOpen, selectedSectorId])

  useEffect(() => { loadSectorsAndOrders() }, [loadSectorsAndOrders])

  // 3b. Tiempo real: refresca el mapa de mesas al instante y avisa cuando
  // cocina marca una orden lista. Refs para no reconectar en cada render.
  const loadRef = useRef(loadSectorsAndOrders)
  useEffect(() => { loadRef.current = loadSectorsAndOrders }, [loadSectorsAndOrders])
  const modeRef = useRef(mode)
  useEffect(() => { modeRef.current = mode }, [mode])

  useEffect(() => {
    if (!sessionReady || !cashOpen) return
    const conn = connectRealtime((e) => {
      if (e.evento === "lista") {
        toast({
          title: e.numeroMesa ? `🛎️ Mesa ${e.numeroMesa} lista` : "🛎️ Orden lista para servir",
          description: "Cocina terminó de preparar el pedido.",
        })
      }
      // Solo refrescar el estado de mesas en la vista de mesas; en la vista de
      // orden el cajero está editando y no conviene pisar su estado local
      if (modeRef.current === "tables") loadRef.current()
    })
    return () => { conn.stop().catch(() => {}) }
  }, [sessionReady, cashOpen])

  // 4. Load menu items + modifiers
  useEffect(() => {
    if (!sessionReady) return
    platillosApi.getAll("pos").then((apiPlats) => {
      const items: MenuItem[] = apiPlats
        .filter((p) => p.disponible)
        .map((p) => ({ id: String(p.id), name: p.nombre, price: p.precio, category: p.categoriaNombre || "Sin categoría" }))
      setMenuItems(items)
      const modsMap: Record<string, ModifierGroup[]> = {}
      apiPlats.forEach((p) => {
        if (p.modificadores?.length) {
          modsMap[String(p.id)] = p.modificadores.map((g) => ({
            id: String(g.grupoId), name: g.grupoNombre, type: g.tipo as "single" | "multiple",
            required: g.obligatorio ?? false, min: g.minSelecciones ?? 0, max: g.maxSelecciones ?? 0,
            options: (g.opciones || []).filter((o) => o.activo !== false).map((o) => ({ id: String(o.id), name: o.nombre, priceDelta: o.precioDelta })),
          }))
        }
      })
      setModifiersByItemId(modsMap)
    }).catch(() => {})
  }, [sessionReady])

  // 5. Load waiters — POS role can't access /usuarios (requires admin), use current user
  useEffect(() => {
    if (!sessionReady) return
    const session = getSession("pos")
    if (session) setWaiters([{ id: session.user.id, name: session.user.nombre }])
  }, [sessionReady])

  // 6. Cargar tasa de IVA real del negocio (si difiere, el backend rechazaría los pagos)
  useEffect(() => {
    if (!sessionReady) return
    config.getImpuestos("pos").then((c) => {
      if (typeof c?.ivaPorcentaje === "number" && c.ivaPorcentaje >= 0 && c.ivaPorcentaje <= 100) {
        setTaxRate(c.ivaActivo === false ? 0 : c.ivaPorcentaje / 100)
      }
      if (typeof c?.propinaSugerida === "number" && c.propinaSugerida > 0 && c.propinaSugerida <= 100) {
        setSuggestedTipPct(c.propinaSugerida)
      }
      setTipEnabled(c?.propinaActiva !== false)
    }).catch(() => { /* mantener defaults */ })
  }, [sessionReady])

  // 6b. Datos del negocio para el encabezado del ticket impreso
  useEffect(() => {
    if (!sessionReady) return
    config.getNegocio("pos").then((n) => {
      if (n?.nombre) {
        setNegocio({ nombre: n.nombre, direccion: n.direccion, telefono: n.telefono, ticketFooter: n.ticketFooter })
      }
    }).catch(() => { /* encabezado genérico */ })
  }, [sessionReady])

  // 7. Polling: refresh order statuses every 30s when on tables view
  useEffect(() => {
    if (!sessionReady || !cashOpen || mode !== "tables") return
    const poll = () => {
      ordenes.getAll("pos").then((apiOrdenes) => {
        const active = apiOrdenes.filter((o) => !(["pagada","pagado","cancelada","cancelado"] as string[]).includes(o.estado))
        const tableEstados: Record<string, TableOrderEstado> = {}
        const occupiedIds = new Set<string>()
        active.forEach((o) => {
          if (!o.mesaId) return
          occupiedIds.add(o.mesaId)
          if (o.estado === "lista" || o.estado === "servido") tableEstados[o.mesaId] = "lista"
          else if (!tableEstados[o.mesaId]) tableEstados[o.mesaId] = "en_cocina"
        })
        setSectors((prev) => prev.map((s) => ({
          ...s,
          tables: s.tables.map((t) => ({
            ...t,
            status: occupiedIds.has(t.id) ? "occupied" as const : (accountsByTable[t.id]?.some((a) => a.status !== "pagado" && a.items.length > 0) ? "occupied" as const : "available" as const),
            orderEstado: tableEstados[t.id] || null,
          })),
        })))
      }).catch(() => {})
    }
    const interval = setInterval(poll, 30000)
    return () => clearInterval(interval)
  }, [sessionReady, cashOpen, mode, accountsByTable])

  // 8. Sync current account snapshot to accountsByTable
  useEffect(() => {
    if (isHydratingRef.current || !selectedTable || !selectedAccountId) return
    setAccountsByTable((prev) => {
      const list = prev[selectedTable.id] || []
      const idx = list.findIndex((a) => a.id === selectedAccountId)
      if (idx === -1) return prev
      const next = [...list]
      next[idx] = {
        ...list[idx],
        orderId: orderId || list[idx].orderId,
        startTime: orderStartTime ? orderStartTime.getTime() : list[idx].startTime,
        diners, serviceType, status: orderStatus, discountAmount,
        items: currentOrder,
      }
      return { ...prev, [selectedTable.id]: next }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable?.id, selectedAccountId, currentOrder, orderId, orderStartTime, diners, serviceType, orderStatus, discountAmount])

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(menuItems.map((m) => m.category)))],
    [menuItems],
  )

  const filteredMenu = useMemo(
    () => menuItems.filter((item) => {
      const matchCat = selectedCategory === "Todos" || item.category === selectedCategory
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCat && matchSearch
    }),
    [menuItems, selectedCategory, searchQuery],
  )

  const pendingItems = useMemo(() => currentOrder.filter((i) => !i.sent), [currentOrder])
  const sentItems = useMemo(() => currentOrder.filter((i) => i.sent), [currentOrder])

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const getSelectedAccount = () =>
    selectedTable ? (accountsByTable[selectedTable.id] || []).find((a) => a.id === selectedAccountId) : undefined

  // Payload de un item local para POST /ordenes o POST /ordenes/{id}/items
  const buildItemPayload = (item: OrderItem): CreateOrdenItemRequest => {
    const mods = (item.modifiers || [])
      .filter((m) => m.group && m.option)
      .map((m) => ({
        grupoNombre: m.group,
        opcionNombre: m.option,
        ...(m.opcionId ? { opcionId: m.opcionId } : {}),
        ...(typeof m.priceDelta === "number" ? { precioDelta: m.priceDelta } : {}),
      }))
    return {
      platilloId: item.id,
      nombre: item.name,
      cantidad: item.quantity,
      precioUnitario: item.price,
      notas: item.notes ?? null,
      ...(mods.length > 0 ? { modificadores: mods } : {}),
    }
  }

  // Reconstruye los items locales desde la orden del backend (fuente de verdad
  // tras crear/agregar items: trae los ids reales de cada línea)
  const mapOrdenItems = (orden: Orden): OrderItem[] =>
    orden.items.map((i) => ({
      id: i.platilloId,
      backendItemId: Number(i.id),
      name: i.platilloNombre || i.nombre || menuItems.find((m) => m.id === i.platilloId)?.name || i.platilloId,
      price: i.precioUnitario,
      quantity: i.cantidad,
      category: menuItems.find((m) => m.id === i.platilloId)?.category || "",
      modifiers: (i.modificadores || []).map((m) => ({
        group: m.grupoNombre || "Extra",
        option: m.opcionNombre || "Opción",
        priceDelta: Number(m.precioDelta || 0),
        ...(m.opcionId ? { opcionId: m.opcionId } : {}),
      })),
      notes: i.notas ?? undefined,
      sent: true,
      status: i.estado === "listo" ? "listo" as const : i.estado === "entregado" ? "entregado" as const : "en_cocina" as const,
    }))

  const calculateSubtotal = () =>
    currentOrder.reduce((sum, item) => sum + (item.price + getModifiersPrice(item.modifiers)) * item.quantity, 0)

  const calculateTax = () => Math.max(0, calculateSubtotal() - discountAmount) * TAX_RATE

  // Total del consumo (subtotal - descuento + IVA), sin propina
  const calculateBaseTotal = () => Math.max(0, calculateSubtotal() - discountAmount) + calculateTax()

  // Total a cobrar = consumo + propina
  const calculateTotal = () => calculateBaseTotal() + tipAmount

  // Fija la propina y, si solo hay un método de pago, ajusta su monto al nuevo total
  const applyTip = (newTip: number) => {
    const tip = Math.max(0, Number(newTip.toFixed(2)))
    setTipAmount(tip)
    setPaymentTendersDraft((prev) =>
      prev.length === 1
        ? [{ ...prev[0], amount: Number((calculateBaseTotal() + tip).toFixed(2)) }]
        : prev
    )
  }

  const getInvoiceBreakdownFromTotal = (total: number) => {
    const sub = total / (1 + TAX_RATE)
    return { subtotal: sub, tax: total - sub, total }
  }

  const logAudit = (action: string, description?: string) => {
    setAuditLog((prev) => [...prev, {
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(), userId: currentUser.id, userName: currentUser.name,
      role: currentUser.role, action, description,
    }])
    // Persistir server-side (fire-and-forget): la bitácora real queda en el
    // backend con quién ejecutó la acción, sobrevive refrescos y cambios de equipo
    auditoria.registrar(action, description, "pos").catch(() => {})
  }

  const closeAllDialogs = () => {
    setShowPaymentDialog(false)
    setShowInvoiceDialog(false)
    setShowDiscountDialog(false)
    setShowSplitDialog(false)
    setShowTransferDialog(false)
    setShowModifiersDialog(false)
  }

  const forceReleaseTable = async (tableId: string) => {
    // Find all backend orders for this table and try to cancel/delete them
    try {
      const allOrders = await ordenes.getAll("pos")
      const stuck = allOrders.filter((o) => o.mesaId === tableId && !(["pagada","pagado","cancelada","cancelado"] as string[]).includes(o.estado))
      for (const o of stuck) {
        recentlyPaidOrderIds.current.add(o.id)
        try {
          await ordenes.remove(o.id, "pos") // DELETE also sets estado="cancelado" and frees mesa
        } catch { /* ignore */ }
      }
    } catch { /* ignore fetch errors */ }
    // Clear local state for this table
    setAccountsByTable((prev) => {
      const { [tableId]: _, ...rest } = prev
      return rest
    })
    setTableWaiter((prev) => {
      const { [tableId]: _, ...rest } = prev
      return rest
    })
    updateSectorTableStatus(tableId, "available", null)
    toast({ title: "Mesa liberada", description: "Se cancelaron las órdenes atascadas." })
  }

  const goToTables = () => {
    closeAllDialogs()
    // Sync current order state to accountsByTable BEFORE clearing selection
    // (the async useEffect sync might not fire in time if user clicks fast)
    // Skip syncing if order was already paid — the account was already removed
    if (selectedTable && selectedAccountId && orderStatus !== "pagado") {
      setAccountsByTable((prev) => {
        const list = prev[selectedTable.id] || []
        const idx = list.findIndex((a) => a.id === selectedAccountId)
        if (idx === -1) return prev
        const next = [...list]
        next[idx] = {
          ...list[idx],
          orderId: orderId || list[idx].orderId,
          startTime: orderStartTime ? orderStartTime.getTime() : list[idx].startTime,
          diners, serviceType, status: orderStatus, discountAmount,
          items: currentOrder,
        }
        return { ...prev, [selectedTable.id]: next }
      })
    }
    // Reset order state
    setCurrentOrder([])
    setOrderId(null)
    setOrderStartTime(null)
    setDiners(1)
    setServiceType("mesa")
    setOrderStatus("pendiente")
    setDiscountAmount(0)
    setMode("tables")
    setSelectedTable(null)
    setSelectedAccountId(null)
    if (skipNextReloadRef.current) {
      skipNextReloadRef.current = false
    } else {
      loadSectorsAndOrders()
    }
  }

  const createAccount = (tableId: string, seats: number, labelIndex: number): TableAccount => ({
    id: `ACC-${tableId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: `Cuenta ${labelIndex}`,
    orderId: `TCK-${Date.now()}`,
    startTime: Date.now(),
    diners: seats,
    serviceType: "mesa",
    status: "pendiente",
    discountAmount: 0,
    items: [],
  })

  const getActiveAccounts = (tableId: string) =>
    (accountsByTable[tableId] || []).filter((a) => a.items.length > 0 && a.status !== "pagado")

  const updateSectorTableStatus = (tableId: string, status: SectorTableStatus, orderEstado?: TableOrderEstado) => {
    setSectors((prev) => prev.map((s) => ({
      ...s,
      tables: s.tables.map((t) => t.id === tableId ? { ...t, status, orderEstado: orderEstado !== undefined ? orderEstado : t.orderEstado } : t),
    })))
  }

  const loadAccountIntoState = (acc: TableAccount) => {
    isHydratingRef.current = true
    setSelectedAccountId(acc.id)
    setOrderId(acc.orderId)
    setOrderStartTime(new Date(acc.startTime))
    setDiners(acc.diners)
    setServiceType(acc.serviceType)
    setOrderStatus(acc.status)
    setDiscountAmount(acc.discountAmount)
    setCurrentOrder(acc.items)
    queueMicrotask(() => { isHydratingRef.current = false })
  }

  // ─── Supervisor PIN via API ────────────────────────────────────────────────
  const requireSupervisor = (label: string, onApproved: () => void) => {
    if (currentUser.role === "supervisor") { onApproved(); return }
    setSupervisorActionLabel(label)
    setPendingSupervisorAction(() => onApproved)
    setSupervisorPinInput("")
    setSupervisorError("")
    setShowSupervisorDialog(true)
  }

  const handleSupervisorVerify = async () => {
    setSupervisorLoading(true)
    setSupervisorError("")
    try {
      const res = await config.verificarPin(supervisorPinInput, "pos")
      if (res.ok) {
        setShowSupervisorDialog(false)
        const cb = pendingSupervisorAction
        setPendingSupervisorAction(null)
        setSupervisorPinInput("")
        logAudit("supervisor-override", `${supervisorActionLabel} (por ${res.usuario?.nombre || "supervisor"})`)
        cb && cb()
      } else {
        setSupervisorError("PIN incorrecto")
      }
    } catch {
      setSupervisorError("Error al verificar PIN")
    } finally {
      setSupervisorLoading(false)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Cash ──────────────────────────────────────────────────────────────────
  const openCash = () => {
    setCashOpenLoading(true)
    turnos.create({ efectivoInicial: initialCash }, "pos")
      .then((turno) => {
        setCurrentTurno(turno)
        setCashOpen(true)
        setCurrentCash(initialCash)
        setMode("tables")
        toast({ title: "Caja abierta", description: `Efectivo inicial: Q${initialCash.toFixed(2)}` })
        logAudit("cash-open", `Inicial: Q${initialCash.toFixed(2)}`)
      })
      .catch((e) => {
        toast({ title: "No se pudo abrir la caja", description: String((e as any)?.message ?? e), variant: "destructive" })
      })
      .finally(() => setCashOpenLoading(false))
  }

  // Paso 1 del cierre: cargar la hoja de conteo de inventario (obligatoria)
  const startInventoryCount = async () => {
    if (!currentTurno?.id) { closeCash(); return }
    setConteoLoading(true)
    try {
      const pre = await cortesInventario.preconteo(currentTurno.id, "pos")
      setConteoItems(pre.items.map((i) => ({
        ...i,
        encontreStr: String(i.encontre),
        ingresoStr: String(i.ingreso),
        quedoStr: String(i.quedo),
      })))
      setShowCashClose(false)
      setShowInventoryCount(true)
    } catch (e) {
      toast({ title: "No se pudo cargar el conteo", description: String((e as any)?.message ?? e), variant: "destructive" })
    } finally {
      setConteoLoading(false)
    }
  }

  const setConteoField = (insumoId: string, field: "encontreStr" | "ingresoStr" | "quedoStr", value: string) => {
    setConteoItems((prev) => prev.map((r) => r.insumoId === insumoId ? { ...r, [field]: value } : r))
  }

  // Paso 2: guardar el corte de inventario y cerrar el turno
  const confirmInventoryCount = async () => {
    if (!currentTurno?.id || conteoSaving) return
    setConteoSaving(true)
    try {
      await cortesInventario.create({
        turnoId: currentTurno.id,
        detalles: conteoItems.map((r) => ({
          insumoId: r.insumoId,
          encontre: Number(r.encontreStr) || 0,
          ingreso: Number(r.ingresoStr) || 0,
          quedo: Number(r.quedoStr) || 0,
        })),
      }, "pos")
      logAudit("inventory-count", `${conteoItems.length} insumos contados`)
      setShowInventoryCount(false)
      closeCash()   // recién ahora se cierra el turno
    } catch (e) {
      toast({ title: "No se pudo guardar el conteo", description: String((e as any)?.message ?? e), variant: "destructive" })
    } finally {
      setConteoSaving(false)
    }
  }

  const closeCash = () => {
    const diff = physicalCount - currentCash
    const doClose = () => {
      setShowCashClose(false)
      setCashOpen(false)
      setCurrentTurno(null)
      setMode("cash-open")
      toast({
        title: "Cierre de caja",
        description: `Sistema: Q${currentCash.toFixed(2)} | Físico: Q${physicalCount.toFixed(2)} | Diferencia: Q${diff.toFixed(2)}`,
      })
      logAudit("cash-close", `Sistema Q${currentCash.toFixed(2)} · Físico Q${physicalCount.toFixed(2)} · Dif Q${diff.toFixed(2)}`)
      clearShiftData()
      setPayments([])
      setInvoices([])
      setAuditLog([])
      setCurrentShift((prev) => ({
        ...prev, shiftId: "", startTime: new Date(), endTime: undefined,
        totalSales: 0, totalOrders: 0, paymentMethods: { cash: 0, card: 0, transfer: 0 }, productsUsed: {},
      }))
      setInitialCash(0)
      setPhysicalCount(0)
      setCurrentCash(0)
    }
    if (currentTurno?.id) {
      turnos.cerrar(currentTurno.id, { efectivoFinalReal: physicalCount }, "pos")
        .then(doClose)
        .catch((e) => {
          toast({ title: "Error al cerrar turno", description: String((e as any)?.message ?? e), variant: "destructive" })
          doClose()
        })
    } else { doClose() }
  }

  const registerCashMove = () => {
    if (!cashMoveReason.trim() || cashMoveAmount <= 0) return
    const monto = cashMoveAmount
    const tipo = cashMoveType
    const motivo = cashMoveReason.trim()
    const exec = async () => {
      // Persistir en el backend (fuente de verdad del efectivo en caja)
      if (currentTurno?.id) {
        try {
          await turnos.addMovimiento(currentTurno.id, { tipo, monto, motivo }, "pos")
        } catch (e) {
          toast({ title: "No se pudo registrar el movimiento", description: String((e as any)?.message ?? e), variant: "destructive" })
          return
        }
      }
      setCurrentCash((prev) => tipo === "entrada" ? prev + monto : prev - monto)
      setShowCashMove(false)
      toast({
        title: tipo === "entrada" ? "Entrada de efectivo" : "Retiro de efectivo",
        description: `Q${monto.toFixed(2)} - ${motivo}`,
      })
      logAudit("cash-" + tipo, `${motivo} · Q${monto.toFixed(2)}`)
      setCashMoveAmount(0)
      setCashMoveReason("")
    }
    if (tipo === "retiro") { requireSupervisor("Autorizar retiro de efectivo", exec); return }
    exec()
  }

  // ─── Table selection ───────────────────────────────────────────────────────
  const handleSelectAreaTable = (areaTable: SectorTable) => {
    // If occupied and already has a waiter, go directly to order view
    const existingWaiter = tableWaiter[areaTable.id]
    const existingAccounts = accountsByTable[areaTable.id] || []

    if (areaTable.status === "occupied" && existingWaiter && existingAccounts.length > 0) {
      // Open directly — skip waiter assignment
      const preferred = existingAccounts.find((a) => a.status !== "pagado" && a.items.length > 0)
        || existingAccounts.find((a) => a.status !== "pagado")
        || existingAccounts[0]
      setSelectedTable({ id: areaTable.id, number: areaTable.number, label: areaTable.label, seats: areaTable.seats })
      setMode("order")
      loadAccountIntoState(preferred)
      return
    }

    // Otherwise show waiter assignment
    setPendingAreaTable(areaTable)
    setSelectedWaiterId(existingWaiter || "")
    setShowAssignWaiter(true)
  }

  const confirmAssignWaiter = () => {
    if (!pendingAreaTable) return
    if (!selectedWaiterId) {
      toast({ title: "Seleccione un mesero", description: "Debe asignar un mesero a la mesa." })
      return
    }
    const tableId = pendingAreaTable.id
    const seats = pendingAreaTable.seats
    const existingAccounts = accountsByTable[tableId] || []
    let nextAccounts = existingAccounts
    if (existingAccounts.length === 0) {
      nextAccounts = [createAccount(tableId, seats, 1)]
      setAccountsByTable((prev) => ({ ...prev, [tableId]: nextAccounts }))
    }
    const preferred = nextAccounts.find((a) => a.status !== "pagado" && a.items.length > 0)
      || nextAccounts.find((a) => a.status !== "pagado")
      || nextAccounts[0]

    setSelectedTable({ id: pendingAreaTable.id, number: pendingAreaTable.number, label: pendingAreaTable.label, seats: pendingAreaTable.seats })
    setTableWaiter((prev) => ({ ...prev, [tableId]: selectedWaiterId }))
    updateSectorTableStatus(tableId, "occupied")
    setShowAssignWaiter(false)
    setMode("order")
    loadAccountIntoState(preferred)

    const waiter = waiters.find((w) => w.id === selectedWaiterId)
    logAudit("assign-waiter", `Mesa ${pendingAreaTable.label} → ${waiter?.name || selectedWaiterId}`)
  }

  // ─── Order operations ─────────────────────────────────────────────────────
  const handleAddItem = (item: MenuItem) => {
    if (!orderStartTime) setOrderStartTime(new Date())
    setPendingItem(item)
    setPendingModifiers({})
    setPendingNotes("")
    setShowModifiersDialog(true)
  }

  const confirmAddItem = () => {
    if (!pendingItem) return
    const groups = modifiersByItemId[pendingItem.id] || []
    // Validate required groups and min/max
    for (const g of groups) {
      const count = g.type === "single"
        ? ((pendingModifiers[g.id] as string) ? 1 : 0)
        : ((pendingModifiers[g.id] as string[]) || []).length
      if (g.required) {
        const minReq = g.type === "single" ? 1 : Math.max(1, g.min)
        if (count < minReq) {
          toast({ title: `"${g.name}" es obligatorio`, description: `Selecciona al menos ${minReq} opción(es)`, variant: "destructive" })
          return
        }
      }
      if (g.type === "multiple" && g.min > 0 && count < g.min) {
        toast({ title: `"${g.name}"`, description: `Selecciona al menos ${g.min} opción(es)`, variant: "destructive" })
        return
      }
      if (g.type === "multiple" && g.max > 0 && count > g.max) {
        toast({ title: `"${g.name}"`, description: `Máximo ${g.max} opción(es) permitida(s)`, variant: "destructive" })
        return
      }
    }
    const mods: OrderItem["modifiers"] = []
    groups.forEach((g) => {
      if (g.type === "single") {
        const sel = pendingModifiers[g.id] as string
        if (sel) {
          const opt = g.options.find((o) => o.id === sel)
          if (opt) mods.push({ group: g.name, option: opt.name, priceDelta: opt.priceDelta || 0, opcionId: opt.id })
        }
      } else {
        const sels = (pendingModifiers[g.id] as string[]) || []
        sels.forEach((sid) => {
          const opt = g.options.find((o) => o.id === sid)
          if (opt) mods.push({ group: g.name, option: opt.name, priceDelta: opt.priceDelta || 0, opcionId: opt.id })
        })
      }
    })
    const newItem: OrderItem = {
      ...pendingItem, quantity: 1, modifiers: mods,
      notes: pendingNotes || undefined, sent: false,
    }
    setCurrentOrder((prev) => [...prev, newItem])
    if (orderStatus === "en_cocina" || orderStatus === "lista") {
      // Adding new items to an existing order — status stays, but we have new pending items
    }
    setShowModifiersDialog(false)
  }

  const handleUpdateQuantity = (index: number, delta: number) => {
    const item = currentOrder[index]
    if (!item) return
    const newQty = item.quantity + delta
    if (newQty <= 0) {
      // Llegar a 0 equivale a eliminar: pasa por el mismo flujo (con
      // autorización de supervisor si ya fue enviado a cocina)
      handleRemoveItem(index)
      return
    }
    // Sincronizar con backend si el item ya existe en la orden del servidor
    const acc = getSelectedAccount()
    if (item.sent && acc?.backendOrdenId && item.backendItemId != null) {
      ordenes.updateItem(acc.backendOrdenId, item.backendItemId, { cantidad: newQty, notas: item.notes ?? null }, "pos")
        .catch((e) => {
          toast({ title: "No se pudo actualizar la cantidad en el servidor", description: String((e as any)?.message ?? e), variant: "destructive" })
        })
    }
    setCurrentOrder((prev) => prev.map((it, i) => i === index ? { ...it, quantity: newQty } : it))
  }

  const handleRemoveItem = (index: number) => {
    const item = currentOrder[index]
    if (!item) return
    const doRemove = () => {
      // Si ya está en el backend, eliminarlo también ahí (cocina deja de verlo
      // y el total de la orden se recalcula en el servidor)
      const acc = getSelectedAccount()
      if (item.sent && acc?.backendOrdenId && item.backendItemId != null) {
        ordenes.removeItem(acc.backendOrdenId, item.backendItemId, "pos")
          .catch((e) => {
            toast({ title: "No se pudo eliminar el item en el servidor", description: String((e as any)?.message ?? e), variant: "destructive" })
          })
      }
      setCurrentOrder((prev) => prev.filter((_, i) => i !== index))
    }
    if (item.sent) {
      requireSupervisor("Autorizar cancelación de ítem ya enviado", () => {
        doRemove()
        logAudit("order-remove-item", item.name)
      })
    } else {
      doRemove()
    }
  }

  // ─── Send to Kitchen ──────────────────────────────────────────────────────
  const handleSendToKitchen = async () => {
    if (!selectedTable || pendingItems.length === 0) return
    if (!currentTurno?.id) {
      toast({ title: "Sin turno activo", description: "Abra la caja antes de enviar pedidos.", variant: "destructive" })
      return
    }

    const session = getSession("pos")
    if (!session) return
    const waiterId = tableWaiter[selectedTable.id] || session.user.id

    const existingOrdenId = getSelectedAccount()?.backendOrdenId

    try {
      let orden: Orden
      if (existingOrdenId) {
        // Ronda adicional: agregar items a la orden YA existente de esta cuenta
        // (antes se creaba una orden nueva por ronda y al pagar quedaban huérfanas)
        let updated: Orden | null = null
        for (const item of pendingItems) {
          updated = await ordenes.addItem(existingOrdenId, buildItemPayload(item), "pos")
        }
        orden = updated!
        // Re-entra a la cola de cocina como pendiente (suena la alerta de nueva ronda)
        try { await ordenes.setEstado(orden.id, "pendiente", "pos") } catch {}
      } else {
        // Primera ronda: crear la orden (nace "pendiente" — cocina la ve como nueva;
        // antes se forzaba "en_cocina" y la campana de cocina nunca sonaba)
        orden = await ordenes.create({
          mesaId: selectedTable.id,
          turnoId: currentTurno.id,
          meseroId: waiterId,
          tipoServicio: serviceType === "domicilio" ? "delivery" : serviceType,
          items: pendingItems.map(buildItemPayload),
        }, "pos")
      }

      // Sincronizar items desde el backend (trae los ids reales de cada línea)
      const syncedItems = mapOrdenItems(orden)
      setCurrentOrder(syncedItems)
      setOrderStatus("en_cocina")
      setOrderId(String(orden.id))

      // Update account with backend order ID
      if (selectedAccountId) {
        setAccountsByTable((prev) => {
          const list = prev[selectedTable.id] || []
          return {
            ...prev,
            [selectedTable.id]: list.map((a) =>
              a.id === selectedAccountId ? { ...a, backendOrdenId: orden.id, status: "en_cocina", items: syncedItems } : a
            ),
          }
        })
      }

      updateSectorTableStatus(selectedTable.id, "occupied", "en_cocina")
      toast({ title: "Pedido enviado a cocina", description: `Mesa ${selectedTable.label} · ${pendingItems.length} items` })
      logAudit("send-kitchen", `Mesa ${selectedTable.label} · ${pendingItems.length} items · Orden ${orden.id}`)

      // Return to tables
      goToTables()
    } catch (e) {
      toast({ title: "Error al crear la orden", description: String((e as any)?.message ?? e), variant: "destructive" })
    }
  }

  // ─── Payment ──────────────────────────────────────────────────────────────
  const handleOpenPayment = () => {
    if (!selectedTable || currentOrder.length === 0) return
    if (!cashOpen) {
      toast({ title: "Caja cerrada", description: "Abra la caja para poder cobrar.", variant: "destructive" })
      return
    }
    // Warn if there are unsent items
    if (pendingItems.length > 0 && sentItems.length === 0) {
      toast({ title: "Items sin enviar", description: "Envíe el pedido a cocina antes de cobrar, o continúe para cobrar directamente." })
    }
    setTipAmount(0)
    setPaymentTendersDraft([{ id: `td-${Date.now()}`, method: "cash", amount: Number(calculateBaseTotal().toFixed(2)) }])
    setShowPaymentDialog(true)
  }

  const handleCompletePayment = async () => {
    if (!selectedTable || currentOrder.length === 0) return
    const waiter = waiters.find((w) => w.id === tableWaiter[selectedTable.id])
    const tenders = paymentTendersDraft
      .map((t) => ({
        ...t,
        amount: Number((Number(t.amount) || 0).toFixed(2)),
        cardBatch: t.method === "card" ? (t.cardBatch || "").trim() || undefined : undefined,
        transferRef: t.method === "transfer" ? (t.transferRef || "").trim() || undefined : undefined,
      }))
      .filter((t) => t.amount > 0)

    if (tenders.length === 0) {
      toast({ title: "Pago inválido", description: "Agregue al menos un método de pago." })
      return
    }
    const totalDue = Number(calculateTotal().toFixed(2))
    const tenderSum = Number(tenders.reduce((s, t) => s + t.amount, 0).toFixed(2))
    if (Math.abs(tenderSum - totalDue) > 0.01) {
      toast({ title: "Monto no cuadra", description: `Total: Q${totalDue.toFixed(2)} · Pagos: Q${tenderSum.toFixed(2)}` })
      return
    }

    // ── Registrar el pago en el backend ANTES del registro local ──
    // Si el servidor lo rechaza, NO se marca como pagado localmente
    // (antes el pago local quedaba registrado aunque el backend fallara).
    let backendPagoId: string | undefined
    if (currentTurno?.id) {
      try {
        let backendOrderId = getSelectedAccount()?.backendOrdenId

        // 1. Asegurar que la orden exista en backend con TODOS los items
        const unsentItems = currentOrder.filter((i) => !i.sent)
        if (!backendOrderId) {
          // Cobro directo sin pasar por cocina: crear la orden ahora
          const nueva = await ordenes.create({
            mesaId: selectedTable.id,
            turnoId: currentTurno.id,
            meseroId: waiter?.id || currentUser.id,
            tipoServicio: serviceType === "domicilio" ? "delivery" : serviceType,
            items: currentOrder.map(buildItemPayload),
          }, "pos")
          backendOrderId = nueva.id
        } else if (unsentItems.length > 0) {
          // Items pendientes de enviar: agregarlos para que el total cuadre
          for (const it of unsentItems) {
            await ordenes.addItem(backendOrderId, buildItemPayload(it), "pos")
          }
        }

        // 2. Persistir descuento y propina (el backend recalcula impuestos y total;
        //    la propina se suma al total que los tenders deben cubrir)
        if (discountAmount > 0 || tipAmount > 0) {
          await ordenes.update(backendOrderId, {
            descuento: discountAmount, propina: tipAmount, notas: null, comensales: diners,
          }, "pos")
        }

        // 3. Verificar que lo cobrado cubre el total según el servidor
        const backendOrden = await ordenes.getOne(backendOrderId, "pos")
        if (tenderSum < Number(backendOrden.total) - 0.01) {
          toast({
            title: "Total no coincide con el servidor",
            description: `Servidor: Q${Number(backendOrden.total).toFixed(2)} · Cobrado: Q${tenderSum.toFixed(2)}. Verifique IVA/descuento en configuración.`,
            variant: "destructive",
          })
          return
        }

        // 4. Registrar el pago (claves de método tal como están en BD)
        recentlyPaidOrderIds.current.add(backendOrderId)
        const pago = await pagos.create({
          ordenId: backendOrderId,
          turnoId: currentTurno.id,
          meseroId: waiter?.id || currentUser.id,
          tenders: tenders.map((t) => ({
            metodo: t.method,
            monto: t.amount,
            referenciaLote: t.method === "card" ? (t.cardBatch ?? null) : null,
            referenciaTransf: t.method === "transfer" ? (t.transferRef ?? null) : null,
          })),
        }, "pos")
        backendPagoId = pago.id
      } catch (err) {
        const msg = String((err as any)?.message ?? err)
        if (msg.includes("ya está pagada")) {
          console.info("[POS] Payment already registered for this order — ignoring")
        } else {
          console.error("[POS] pagos.create error:", err)
          toast({ title: "Pago no registrado en el servidor", description: msg, variant: "destructive" })
          return
        }
      }
    }

    const payment: Payment = {
      id: `PAY-${Date.now()}`, backendPagoId, orderId: orderId || `ORD-${Date.now()}`,
      tableNumber: selectedTable.label, amount: calculateTotal(), tenders,
      timestamp: new Date(), userId: currentUser.id, userName: currentUser.name,
      invoiced: false, items: currentOrder.map((i) => ({ ...i })),
      waiterId: waiter?.id, waiterName: waiter?.name,
      discountAmount, tipAmount,
    }
    setPayments((prev) => [...prev, payment])

    // Update shift
    const upShift = { ...currentShift }
    upShift.totalSales += payment.amount
    upShift.totalOrders += 1
    tenders.forEach((t) => { upShift.paymentMethods[t.method] += t.amount })
    currentOrder.forEach((item) => {
      upShift.productsUsed[item.name] = (upShift.productsUsed[item.name] || 0) + item.quantity
    })
    if (tenders.some((t) => t.method === "cash")) {
      setCurrentCash((prev) => prev + tenders.filter((t) => t.method === "cash").reduce((s, t) => s + t.amount, 0))
    }
    setCurrentShift(upShift)

    // Backend handles setting order to "pagada" inside CreatePagoAsync — no manual setEstado needed

    // Remove paid account from accountsByTable (clean up so table can be released)
    setOrderStatus("pagado")
    const otherAccounts = (accountsByTable[selectedTable.id] || [])
      .filter((a) => a.id !== selectedAccountId && a.status !== "pagado" && a.items.length > 0)
    if (selectedAccountId) {
      setAccountsByTable((prev) => {
        const list = prev[selectedTable.id] || []
        const remaining = list.filter((a) => a.id !== selectedAccountId)
        if (remaining.length === 0) {
          const { [selectedTable.id]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [selectedTable.id]: remaining }
      })
    }

    // Release table if no more active accounts
    updateSectorTableStatus(
      selectedTable.id,
      otherAccounts.length > 0 ? "occupied" : "available",
      otherAccounts.length > 0 ? undefined : null,
    )
    // Clear waiter assignment if table fully released
    if (otherAccounts.length === 0) {
      setTableWaiter((prev) => { const { [selectedTable.id]: _, ...rest } = prev; return rest })
    }

    setShowPaymentDialog(false)
    skipNextReloadRef.current = true
    logAudit("payment", `Mesa ${selectedTable.label} · Q${payment.amount.toFixed(2)}`)

    // Facturación cerrada (futura FEL): imprimir recibo y volver a mesas.
    // Cuando se reactive, se ofrece la factura como antes.
    if (!FACTURACION_HABILITADA) {
      printAndGoToTables()
      return
    }

    // Offer invoice immediately
    setCurrentPayment(payment)
    setInvoiceCustomerName("")
    setInvoiceCustomerRFC("")
    setShowInvoiceDialog(true)
  }

  // ─── Invoice ──────────────────────────────────────────────────────────────
  const handleGenerateInvoice = async () => {
    if (!currentPayment) return

    // Registrar la factura en el backend (folio real + marca el pago como facturado)
    let folio: string | undefined
    if (currentPayment.backendPagoId) {
      try {
        // El backend exige nombre y RFC: usar consumidor final si no se capturan
        const factura = await facturas.create({
          pagoId: currentPayment.backendPagoId,
          clienteNombre: invoiceCustomerName || "Consumidor Final",
          clienteRfc: invoiceCustomerRFC || "CF",
        }, "pos")
        folio = factura.folio
      } catch (e) {
        toast({ title: "Factura no registrada en el servidor", description: String((e as any)?.message ?? e), variant: "destructive" })
        return
      }
    }

    const { subtotal, tax, total } = getInvoiceBreakdownFromTotal(currentPayment.amount)
    const invoice: Invoice = {
      id: folio || `INV-${Date.now()}`, paymentId: currentPayment.id,
      tableNumber: currentPayment.tableNumber, items: currentPayment.items,
      subtotal, tax, total, timestamp: new Date(),
      customerName: invoiceCustomerName || undefined, customerRFC: invoiceCustomerRFC || undefined,
    }
    setInvoices((prev) => [...prev, invoice])
    setPayments((prev) => prev.map((p) => p.id === currentPayment.id ? { ...p, invoiced: true } : p))
    setShowInvoiceDialog(false)
    setCurrentPayment(null)
    logAudit("invoice", `${invoice.id} · Mesa ${invoice.tableNumber}`)
    toast({ title: "Factura generada", description: folio ? `Folio ${folio}` : invoice.id })
    printAndGoToTables()
  }

  const handleSkipInvoice = () => {
    setShowInvoiceDialog(false)
    setCurrentPayment(null)
    printAndGoToTables()
  }

  const printAndGoToTables = () => {
    // Set print data and trigger print
    const lastPayment = payments[payments.length - 1]
    if (lastPayment) {
      triggerPrintTicket({
        kind: "payment", ticketId: lastPayment.orderId, timestamp: lastPayment.timestamp,
        tableNumber: lastPayment.tableNumber,
        waiterName: lastPayment.waiterName || "-", serviceType,
        diners, items: lastPayment.items, discountAmount: lastPayment.discountAmount,
        tipAmount: lastPayment.tipAmount,
        tenders: lastPayment.tenders, paidBy: lastPayment.userName,
      })
      setTimeout(() => {
        setTimeout(() => goToTables(), 300)
      }, 100)
    } else {
      goToTables()
    }
  }

  // ─── Split bill ───────────────────────────────────────────────────────────
  const openSplitDialog = () => {
    const n = splitPeople
    const methods: Record<number, "cash" | "card" | "transfer"> = {}
    const paid: Record<number, boolean> = {}
    for (let i = 1; i <= n; i++) { methods[i] = "cash"; paid[i] = false }
    setSplitPayMethods(methods)
    setSplitPaid(paid)
    const assignments: Record<string, number | "all"> = {}
    currentOrder.forEach((item, idx) => { assignments[idx] = "all" })
    setSplitAssignments(assignments)
    setShowSplitDialog(true)
  }

  const splitPersonTotals = useMemo(() => {
    const sub = currentOrder.reduce((sum, item) => sum + (item.price + getModifiersPrice(item.modifiers)) * item.quantity, 0)
    const disc = Math.min(discountAmount, sub)
    const itemLines = currentOrder.map((item, idx) => ({
      idx, lineTotal: (item.price + getModifiersPrice(item.modifiers)) * item.quantity,
      assignment: splitAssignments[idx] ?? "all",
    }))
    const equalPoolRaw = itemLines.filter((i) => i.assignment === "all").reduce((s, i) => s + i.lineTotal, 0)
    const equalShare = equalPoolRaw / Math.max(1, splitPeople)
    const totals: Record<number, number> = {}
    for (let p = 1; p <= splitPeople; p++) {
      const assigned = itemLines.filter((i) => i.assignment === p).reduce((s, i) => s + i.lineTotal, 0)
      const personRaw = assigned + equalShare
      const personDisc = sub > 0 ? (personRaw / sub) * disc : 0
      const taxable = Math.max(0, personRaw - personDisc)
      totals[p] = Math.round(taxable * (1 + TAX_RATE) * 100) / 100
    }
    return totals
  }, [currentOrder, splitPeople, splitAssignments, discountAmount, TAX_RATE])

  // ─── Status helpers ────────────────────────────────────────────────────────
  const getTableColor = (t: SectorTable) => {
    if (t.status === "reserved") return "border-blue-500/40 bg-blue-500/10"
    if (t.status === "available") return "border-green-500/40 bg-green-500/10"
    if (t.orderEstado === "lista") return "border-amber-500/40 bg-amber-500/10 animate-pulse"
    return "border-red-500/40 bg-red-500/10"
  }

  const getTableStatusLabel = (t: SectorTable) => {
    if (t.status === "reserved") return "Reservada"
    if (t.status === "available") return "Disponible"
    if (t.orderEstado === "lista") return "Lista ✓"
    return "En cocina"
  }

  const getTableStatusBadgeClass = (t: SectorTable) => {
    if (t.orderEstado === "lista") return "bg-amber-500/20 text-amber-600 border-amber-500/30"
    return ""
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Early returns
  // ═══════════════════════════════════════════════════════════════════════════

  if (!sessionReady) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Print Ticket (hidden, only for print media)
  // ═══════════════════════════════════════════════════════════════════════════

  const printTicketEl = <PrintTicketView ticket={printTicket} taxRate={TAX_RATE} negocio={negocio} />
  const printReportEl = <PrintReportView report={printReport} cashierName={currentShift.userName} negocio={negocio} />

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Step 0: Cash Open (blocking)
  // ═══════════════════════════════════════════════════════════════════════════

  if (mode === "cash-open") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center no-print">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <DollarSign className="w-6 h-6" />
              Apertura de Caja
            </CardTitle>
            <CardDescription>Ingrese el conteo inicial de efectivo para comenzar el turno</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cajero</Label>
              <div className="text-sm font-medium">{currentUser.name}</div>
            </div>
            <div className="space-y-2">
              <Label>Efectivo inicial (Q)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={initialCash}
                onChange={(e) => setInitialCash(Math.max(0, Number(e.target.value)))}
                autoFocus
              />
            </div>
            <Button className="w-full" size="lg" onClick={openCash} disabled={cashOpenLoading}>
              {cashOpenLoading ? "Abriendo..." : "Abrir Caja y Comenzar Turno"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => { clearSession("pos"); clearActiveEstablecimiento("pos"); router.push("/pos/login") }}>
              <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Step 1: Table Map
  // ═══════════════════════════════════════════════════════════════════════════

  if (mode === "tables") {
    const sector = sectors.find((s) => s.id === selectedSectorId)
    return (
      <>
      <div className="min-h-screen bg-background no-print">
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">Punto de Venta</h1>
                  <p className="text-sm text-muted-foreground">Seleccione una mesa para comenzar</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Badge variant="outline" className="gap-1"><Users className="w-3 h-3" />{currentUser.name}</Badge>
                <Badge variant="outline" className="gap-1">
                  {allSectorTables.filter((t) => t.status === "occupied").length}/{allSectorTables.length} ocupadas
                </Badge>
                <Badge variant="outline" className="gap-1 text-green-600">
                  <DollarSign className="w-3 h-3" />Q{currentCash.toFixed(2)}
                </Badge>

                {/* Cash management */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><CreditCard className="w-4 h-4 mr-2" />Caja</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Gestión de Caja</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowCashMove(true)}>Movimiento de efectivo</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowCashClose(true)}>Cerrar Caja</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {FACTURACION_HABILITADA && (
                  <Button variant="outline" size="sm" onClick={() => setShowBillingDialog(true)}>
                    <Receipt className="w-4 h-4 mr-2" />Facturación
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowReportsDialog(true)}>
                  <BarChart3 className="w-4 h-4 mr-2" />Reportes
                </Button>
                <Button variant="outline" size="sm" onClick={() => loadSectorsAndOrders()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { clearSession("pos"); clearActiveEstablecimiento("pos"); router.push("/pos/login") }}>
                  <LogOut className="w-4 h-4 mr-1" />Salir
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          {sectors.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p>No hay secciones configuradas. Configure secciones y mesas en Administración.</p>
            </div>
          ) : (
            <Tabs value={selectedSectorId} onValueChange={setSelectedSectorId}>
              <TabsList className="w-full mb-6" style={{ display: "grid", gridTemplateColumns: `repeat(${sectors.length}, 1fr)` }}>
                {sectors.map((s) => (
                  <TabsTrigger key={s.id} value={s.id}>{s.name}</TabsTrigger>
                ))}
              </TabsList>

              {sectors.map((s) => (
                <TabsContent key={s.id} value={s.id}>
                  {s.tables.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">No hay mesas en esta sección.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {s.tables.map((t) => (
                        <Card
                          key={t.id}
                          className={`cursor-pointer transition-all hover:shadow-lg ${getTableColor(t)}`}
                          onClick={() => t.status !== "reserved" && handleSelectAreaTable(t)}
                          onContextMenu={(e) => {
                            if (t.status === "occupied") {
                              e.preventDefault()
                              if (confirm(`¿Liberar Mesa ${t.label}? Esto cancelará las órdenes activas.`)) {
                                forceReleaseTable(t.id)
                              }
                            }
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold mb-1">{t.label}</div>
                              <div className="text-xs text-muted-foreground mb-2">
                                <Users className="w-3 h-3 inline mr-1" />{t.seats} personas
                              </div>
                              <Badge variant="outline" className={`text-xs ${getTableStatusBadgeClass(t)}`}>
                                {getTableStatusLabel(t)}
                              </Badge>
                              {t.status === "occupied" && tableWaiter[t.id] && (
                                <div className="text-[10px] text-muted-foreground mt-1">
                                  {waiters.find((w) => w.id === tableWaiter[t.id])?.name}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Legend */}
          <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Disponible</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> En cocina</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Lista para cobrar</span>
          </div>
        </main>
      </div>

      {/* Dialogs shared with tables view */}
      {renderDialogs()}
      {printTicketEl}
      {printReportEl}
      </>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — Step 2: Order View
  // ═══════════════════════════════════════════════════════════════════════════

  const currentAccounts = selectedTable ? (accountsByTable[selectedTable.id] || []) : []

  return (
    <>
    <div className="min-h-screen bg-background no-print">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={goToTables}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold">Mesa {selectedTable?.label}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {orderStatus === "pendiente" ? "Nueva orden" : orderStatus === "en_cocina" ? "En cocina" : orderStatus === "lista" ? "Lista" : "Pagada"}
                  </Badge>
                  <span>·</span>
                  <span>{waiters.find((w) => w.id === (selectedTable ? tableWaiter[selectedTable.id] : ""))?.name || "Sin mesero"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Account selector */}
              {selectedTable && currentAccounts.length > 0 && (
                <Select
                  value={selectedAccountId || ""}
                  onValueChange={(val) => {
                    const acc = currentAccounts.find((a) => a.id === val)
                    if (acc) { closeAllDialogs(); loadAccountIntoState(acc) }
                  }}
                >
                  <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currentAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.label} {a.status === "pagado" ? "✓" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedTable && currentAccounts.length < MAX_ACCOUNTS_PER_TABLE && (
                <Button variant="outline" size="sm" onClick={() => {
                  const newAcc = createAccount(selectedTable.id, selectedTable.seats, currentAccounts.length + 1)
                  setAccountsByTable((prev) => ({ ...prev, [selectedTable.id]: [...(prev[selectedTable.id] || []), newAcc] }))
                  loadAccountIntoState(newAcc)
                  toast({ title: "Nueva cuenta creada", description: newAcc.label })
                }}>+ Cuenta</Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* ─── Menu (Left) ─── */}
          <div className="lg:col-span-3">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Menú</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-9" />
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {categories.map((cat) => (
                    <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm"
                      className="h-9 text-xs touch-manipulation" onClick={() => setSelectedCategory(cat)}>{cat}</Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filteredMenu.map((item) => (
                      <Card key={item.id} className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all touch-manipulation select-none min-h-20"
                        onClick={() => orderStatus !== "pagado" && handleAddItem(item)}>
                        <CardContent className="p-3 flex flex-col h-full">
                          <div className="font-medium text-sm leading-tight">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.category}</div>
                          <div className="font-bold text-primary mt-auto pt-1">Q{item.price.toFixed(2)}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* ─── Order (Right) ─── */}
          <div className="lg:col-span-2">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Comanda
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs">
                    <Select value={serviceType} onValueChange={(v) => setServiceType(v as any)}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mesa">En mesa</SelectItem>
                        <SelectItem value="para_llevar">Para llevar</SelectItem>
                        <SelectItem value="domicilio">Domicilio</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <Input type="number" className="h-7 w-14 text-xs" value={diners}
                        onChange={(e) => setDiners(Math.max(1, Number(e.target.value)))} />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-520px)] mb-3">
                  {currentOrder.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Seleccione productos del menú</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentOrder.map((item, idx) => (
                        <div key={idx} className={`rounded-lg border p-2 ${item.sent ? "bg-muted/30" : ""}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                {item.name}
                                {item.sent && (
                                  <Badge variant="outline" className="text-[9px] h-4">
                                    {item.status === "listo" ? "✓ Listo" : item.status === "entregado" ? "Entregado" : "🔥 Cocina"}
                                  </Badge>
                                )}
                              </div>
                              {item.modifiers && item.modifiers.length > 0 && (
                                <div className="text-[10px] text-muted-foreground">
                                  {item.modifiers.map((m, i) => <span key={i}>{m.group}: {m.option}{m.priceDelta ? ` (+Q${m.priceDelta})` : ""}{i < item.modifiers!.length - 1 ? ", " : ""}</span>)}
                                </div>
                              )}
                              {item.notes && <div className="text-[10px] italic text-muted-foreground">Obs: {item.notes}</div>}
                            </div>
                            {orderStatus !== "pagado" && (
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive"
                                onClick={() => handleRemoveItem(idx)}><Trash2 className="w-3 h-3" /></Button>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1.5">
                              {!item.sent && orderStatus !== "pagado" && (<>
                                <Button size="sm" variant="outline" className="h-9 w-9 p-0 touch-manipulation"
                                  onClick={() => handleUpdateQuantity(idx, -1)}><Minus className="w-4 h-4" /></Button>
                                <span className="text-sm font-medium w-7 text-center">{item.quantity}</span>
                                <Button size="sm" variant="outline" className="h-9 w-9 p-0 touch-manipulation"
                                  onClick={() => handleUpdateQuantity(idx, 1)}><Plus className="w-4 h-4" /></Button>
                              </>)}
                              {item.sent && <span className="text-sm text-muted-foreground">×{item.quantity}</span>}
                            </div>
                            <span className="font-bold text-primary text-sm">
                              Q{((item.price + getModifiersPrice(item.modifiers)) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <Separator className="my-2" />

                {/* Totals */}
                <div className="space-y-1 text-sm mb-3">
                  <div className="flex justify-between"><span>Subtotal</span><span>Q{calculateSubtotal().toFixed(2)}</span></div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600"><span>Descuento</span><span>-Q{discountAmount.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between"><span>IVA ({(TAX_RATE * 100).toFixed(0)}%)</span><span>Q{calculateTax().toFixed(2)}</span></div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span><span className="text-primary">Q{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Actions — contextual based on order status */}
                <div className="space-y-2">
                  {/* Primary action row */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Send to kitchen — enabled when there are unsent items */}
                    <Button
                      className="w-full"
                      variant={pendingItems.length > 0 ? "default" : "outline"}
                      disabled={pendingItems.length === 0 || orderStatus === "pagado"}
                      onClick={handleSendToKitchen}
                    >
                      <ChefHat className="w-4 h-4 mr-2" />
                      Enviar a Cocina {pendingItems.length > 0 && `(${pendingItems.length})`}
                    </Button>

                    {/* Charge — enabled when there are items */}
                    <Button
                      className="w-full"
                      variant={orderStatus === "lista" || (sentItems.length > 0 && pendingItems.length === 0) ? "default" : "outline"}
                      disabled={currentOrder.length === 0 || orderStatus === "pagado"}
                      onClick={handleOpenPayment}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Cobrar
                    </Button>
                  </div>

                  {/* Secondary actions */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" disabled={currentOrder.length === 0}
                      onClick={() => setShowDiscountDialog(true)}>Descuento</Button>
                    <Button variant="outline" size="sm" disabled={currentOrder.length === 0}
                      onClick={() => {
                        triggerPrintTicket({
                          kind: "precount", ticketId: orderId || "-",
                          timestamp: orderStartTime || new Date(),
                          tableNumber: selectedTable?.label, serviceType,
                          waiterName: selectedTable ? (waiters.find((w) => w.id === tableWaiter[selectedTable.id])?.name || "-") : "-",
                          diners, items: currentOrder, discountAmount, tenders: [],
                        })
                      }}>Precuenta</Button>
                    <Button variant="outline" size="sm" disabled={currentOrder.length === 0}
                      onClick={openSplitDialog}>Dividir</Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" disabled={currentOrder.length === 0}
                      onClick={() => { setTransferTargetId(null); setTransferQtyByIndex({}); setShowTransferDialog(true) }}>
                      Transferir
                    </Button>
                    <Button variant="destructive" size="sm"
                      disabled={currentOrder.length === 0 || orderStatus === "pagado"}
                      onClick={() => requireSupervisor("Autorizar cancelación de pedido", () => {
                        setCurrentOrder([])
                        setOrderId(null)
                        setOrderStartTime(null)
                        setDiscountAmount(0)
                        setOrderStatus("pendiente")
                        toast({ title: "Pedido cancelado" })
                        logAudit("order-cancel", `Mesa ${selectedTable?.label}`)
                      })}>
                      Cancelar pedido
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>

    {renderDialogs()}
    {printTicketEl}
    {printReportEl}
    </>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — All Dialogs (shared)
  // ═══════════════════════════════════════════════════════════════════════════

  function renderDialogs() {
    return (<>
      {/* Assign Waiter */}
      <Dialog open={showAssignWaiter} onOpenChange={setShowAssignWaiter}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Mesero</DialogTitle>
            <DialogDescription>Mesa {pendingAreaTable?.label} · {pendingAreaTable?.seats} personas</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Mesero</Label>
            <Select value={selectedWaiterId} onValueChange={setSelectedWaiterId}>
              <SelectTrigger><SelectValue placeholder="Seleccione mesero" /></SelectTrigger>
              <SelectContent>
                {waiters.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignWaiter(false)}>Cancelar</Button>
            <Button onClick={confirmAssignWaiter} disabled={!selectedWaiterId}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modifiers / Notes */}
      <Dialog open={showModifiersDialog} onOpenChange={setShowModifiersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pendingItem?.name}</DialogTitle>
            <DialogDescription>Seleccione modificadores y/o agregue observaciones</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            {pendingItem && (modifiersByItemId[pendingItem.id] || []).map((group) => (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-sm">{group.name}</Label>
                  {group.required && <span className="text-red-500 text-xs font-bold">*</span>}
                  {(group.type === "multiple" && (group.min > 0 || group.max > 0)) && (
                    <span className="text-[10px] text-muted-foreground">
                      ({group.min > 0 ? `mín ${group.min}` : ""}{group.min > 0 && group.max > 0 ? ", " : ""}{group.max > 0 ? `máx ${group.max}` : ""})
                    </span>
                  )}
                </div>
                {group.type === "single" ? (
                  <RadioGroup value={(pendingModifiers[group.id] as string) || ""}
                    onValueChange={(v) => setPendingModifiers((p) => ({ ...p, [group.id]: v }))} className="grid grid-cols-2 gap-2">
                    {group.options.map((opt) => (
                      <div key={opt.id} className="flex items-center space-x-2 rounded-md border p-2">
                        <RadioGroupItem id={`${group.id}-${opt.id}`} value={opt.id} />
                        <Label htmlFor={`${group.id}-${opt.id}`} className="flex-1 cursor-pointer">
                          {opt.name}{opt.priceDelta ? <span className="text-xs text-muted-foreground"> (+Q{opt.priceDelta})</span> : null}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (() => {
                  const arr = (pendingModifiers[group.id] as string[]) || []
                  const atMax = group.max > 0 && arr.length >= group.max
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {group.options.map((opt) => {
                        const isChecked = arr.includes(opt.id)
                        return (
                          <label key={opt.id} className={`flex items-center space-x-2 rounded-md border p-2 cursor-pointer ${!isChecked && atMax ? "opacity-40 cursor-not-allowed" : ""}`}>
                            <Checkbox checked={isChecked}
                              disabled={!isChecked && atMax}
                              onCheckedChange={(v) => setPendingModifiers((p) => {
                                const prev = (p[group.id] as string[]) || []
                                return { ...p, [group.id]: v ? [...prev, opt.id] : prev.filter((x) => x !== opt.id) }
                              })} />
                            <span>{opt.name}{opt.priceDelta ? <span className="text-xs text-muted-foreground"> (+Q{opt.priceDelta})</span> : null}</span>
                          </label>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            ))}
            {(!pendingItem || !(modifiersByItemId[pendingItem.id]?.length)) && (
              <p className="text-xs text-muted-foreground italic">Este platillo no tiene modificadores configurados.</p>
            )}
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea placeholder="Sin cebolla, extra salsa..." value={pendingNotes} onChange={(e) => setPendingNotes(e.target.value)} />
            </div>
          </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModifiersDialog(false)}>Cancelar</Button>
            <Button onClick={confirmAddItem}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
            <DialogDescription>Mesa {selectedTable?.label} · Total: Q{calculateTotal().toFixed(2)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea className="max-h-40">
              {currentOrder.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-0.5">
                  <span>{item.quantity}× {item.name}</span>
                  <span>Q{((item.price + getModifiersPrice(item.modifiers)) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </ScrollArea>
            <Separator />

            {/* Propina (solo si está activa en la config de la sucursal) */}
            {tipEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Propina</Label>
                <span className="text-xs text-muted-foreground">Sugerida: {suggestedTipPct}%</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[0, suggestedTipPct, suggestedTipPct + 5, 15].filter((v, i, arr) => arr.indexOf(v) === i).map((pct) => {
                  const tipForPct = Number((calculateBaseTotal() * (pct / 100)).toFixed(2))
                  const active = Math.abs(tipAmount - tipForPct) < 0.01
                  return (
                    <Button key={pct} type="button" size="sm" variant={active ? "default" : "outline"}
                      className={`min-h-11 ${active ? "" : "bg-transparent"}`}
                      onClick={() => applyTip(tipForPct)}>
                      {pct === 0 ? "Sin propina" : `${pct}%`}
                    </Button>
                  )
                })}
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Q</span>
                  <Input type="number" step="0.01" className="w-24 min-h-11" value={tipAmount || ""}
                    placeholder="0.00"
                    onChange={(e) => applyTip(Number(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            )}

            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Consumo</span><span>Q{calculateBaseTotal().toFixed(2)}</span></div>
              {tipAmount > 0 && <div className="flex justify-between text-muted-foreground"><span>Propina</span><span>Q{tipAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span><span className="text-primary">Q{calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Métodos de pago</Label>
                <Button variant="outline" size="sm" onClick={() =>
                  setPaymentTendersDraft((p) => [...p, { id: `td-${Date.now()}-${p.length}`, method: "cash", amount: 0 }])
                }><Plus className="w-3 h-3 mr-1" />Agregar</Button>
              </div>
              {paymentTendersDraft.map((tender, idx) => {
                const sum = Number(paymentTendersDraft.reduce((s, x) => s + (Number(x.amount) || 0), 0).toFixed(2))
                const remaining = Number((Number(calculateTotal().toFixed(2)) - sum).toFixed(2))
                return (
                  <div key={tender.id} className="rounded-md border p-3 space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label className="text-xs">Método</Label>
                        <Select value={tender.method} onValueChange={(v) =>
                          setPaymentTendersDraft((p) => p.map((x) => x.id === tender.id ? { ...x, method: v as any } : x))
                        }>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="card">Tarjeta</SelectItem>
                            <SelectItem value="transfer">Transferencia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-5">
                        <Label className="text-xs">Monto</Label>
                        <Input type="number" step="0.01" value={tender.amount}
                          onChange={(e) => setPaymentTendersDraft((p) => p.map((x) => x.id === tender.id ? { ...x, amount: Number(e.target.value) } : x))} />
                      </div>
                      <div className="col-span-2">
                        <Button variant="outline" size="icon" disabled={paymentTendersDraft.length === 1}
                          onClick={() => setPaymentTendersDraft((p) => p.filter((x) => x.id !== tender.id))}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    {tender.method === "card" && (
                      <div><Label className="text-xs">Lote</Label>
                        <Input value={tender.cardBatch || ""} placeholder="Ej: 123"
                          onChange={(e) => setPaymentTendersDraft((p) => p.map((x) => x.id === tender.id ? { ...x, cardBatch: e.target.value } : x))} />
                      </div>
                    )}
                    {tender.method === "transfer" && (
                      <div><Label className="text-xs">Referencia</Label>
                        <Input value={tender.transferRef || ""} placeholder="Ej: 00012345"
                          onChange={(e) => setPaymentTendersDraft((p) => p.map((x) => x.id === tender.id ? { ...x, transferRef: e.target.value } : x))} />
                      </div>
                    )}
                    {idx === paymentTendersDraft.length - 1 && (
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>Pagado: Q{sum.toFixed(2)}</span>
                        <span className={remaining === 0 ? "text-green-600" : remaining < 0 ? "text-destructive" : ""}>
                          Restante: Q{remaining.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancelar</Button>
            <Button onClick={handleCompletePayment}>Confirmar Pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice (offered after payment) */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Generar Factura?</DialogTitle>
            <DialogDescription>Pago registrado: Q{currentPayment?.amount.toFixed(2) || "0.00"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre del Cliente</Label>
              <Input placeholder="Nombre completo" value={invoiceCustomerName} onChange={(e) => setInvoiceCustomerName(e.target.value)} /></div>
            <div><Label>NIT / RFC</Label>
              <Input placeholder="NIT del cliente" value={invoiceCustomerRFC} onChange={(e) => setInvoiceCustomerRFC(e.target.value)} /></div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleSkipInvoice} className="w-full sm:w-auto">Sin Factura</Button>
            <Button onClick={handleGenerateInvoice} className="w-full sm:w-auto">
              <FileText className="w-4 h-4 mr-2" />Generar Factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount */}
      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aplicar Descuento</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Monto del descuento (Q)</Label>
            <Input type="number" step="0.01" value={discountAmount}
              onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscountDialog(false)}>Cancelar</Button>
            <Button onClick={() => setShowDiscountDialog(false)}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Bill */}
      <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dividir Cuenta</DialogTitle>
            <DialogDescription>Total: Q{calculateTotal().toFixed(2)}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={splitMode === "equal" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setSplitMode("equal")}>Partes iguales</Button>
            <Button variant={splitMode === "byItem" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setSplitMode("byItem")}>Por ítem</Button>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-medium">Personas:</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setSplitPeople((p) => Math.max(2, p - 1))} disabled={splitPeople <= 2}><Minus className="h-3 w-3" /></Button>
            <span className="w-6 text-center font-bold">{splitPeople}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setSplitPeople((p) => Math.min(10, p + 1))} disabled={splitPeople >= 10}><Plus className="h-3 w-3" /></Button>
          </div>
          {splitMode === "byItem" && (
            <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
              {currentOrder.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{item.name} ×{item.quantity}</span>
                  <select className="text-xs border rounded px-1 py-0.5 bg-background w-24"
                    value={splitAssignments[idx] === "all" ? "all" : String(splitAssignments[idx] ?? "all")}
                    onChange={(e) => setSplitAssignments((p) => ({ ...p, [idx]: e.target.value === "all" ? "all" : Number(e.target.value) }))}>
                    <option value="all">Todos</option>
                    {Array.from({ length: splitPeople }, (_, i) => <option key={i + 1} value={i + 1}>Persona {i + 1}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          <Separator />
          <div className="space-y-2 mt-3">
            {Array.from({ length: splitPeople }, (_, i) => i + 1).map((p) => (
              <div key={p} className="flex items-center gap-2 rounded border p-2">
                <span className="text-sm font-medium w-20">Persona {p}</span>
                <span className="font-bold text-primary flex-1">Q{splitPersonTotals[p]?.toFixed(2) ?? "0.00"}</span>
                <select className="text-xs border rounded px-1 py-0.5 bg-background"
                  value={splitPayMethods[p] ?? "cash"} disabled={splitPaid[p]}
                  onChange={(e) => setSplitPayMethods((prev) => ({ ...prev, [p]: e.target.value as "cash" | "card" | "transfer" }))}>
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transfer.</option>
                </select>
                {splitPaid[p]
                  ? <Badge className="bg-green-600 text-white text-xs">Cobrado</Badge>
                  : <Button size="sm" className="h-6 text-xs px-2" onClick={() => setSplitPaid((prev) => ({ ...prev, [p]: true }))}>Cobrar</Button>
                }
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSplitDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transferir Productos</DialogTitle>
            <DialogDescription>Mover productos a otra mesa</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Mesa destino</Label>
              <Select value={transferTargetId ?? ""} onValueChange={setTransferTargetId}>
                <SelectTrigger><SelectValue placeholder="Seleccione mesa" /></SelectTrigger>
                <SelectContent>
                  {allSectorTables.filter((t) => t.id !== selectedTable?.id).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label} · {t.status === "available" ? "Disponible" : "Ocupada"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 max-h-48 overflow-auto">
              {currentOrder.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span>{it.name} (×{it.quantity})</span>
                  <Input type="number" className="h-7 w-16" min={0} max={it.quantity}
                    value={transferQtyByIndex[idx] ?? 0}
                    onChange={(e) => setTransferQtyByIndex((p) => ({ ...p, [idx]: Math.max(0, Math.min(Number(e.target.value) || 0, it.quantity)) }))} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!selectedTable || !transferTargetId) return
              const toMove: OrderItem[] = []
              const remain: OrderItem[] = []
              currentOrder.forEach((it, idx) => {
                const qty = transferQtyByIndex[idx] || 0
                if (qty > 0) toMove.push({ ...it, quantity: qty })
                const leftover = it.quantity - qty
                if (leftover > 0) remain.push({ ...it, quantity: leftover })
              })
              if (toMove.length === 0) { toast({ title: "Nada para transferir" }); return }
              // Add to target table accounts
              const targetAccs = accountsByTable[transferTargetId] || []
              if (targetAccs.length === 0) {
                const tbl = allSectorTables.find((t) => t.id === transferTargetId)
                const newAcc = createAccount(transferTargetId, tbl?.seats || 4, 1)
                newAcc.items = toMove
                setAccountsByTable((prev) => ({ ...prev, [transferTargetId]: [newAcc] }))
              } else {
                setAccountsByTable((prev) => ({
                  ...prev,
                  [transferTargetId]: prev[transferTargetId].map((a, i) => i === 0 ? { ...a, items: [...a.items, ...toMove] } : a),
                }))
              }
              updateSectorTableStatus(transferTargetId, "occupied")
              setCurrentOrder(remain)
              setShowTransferDialog(false)
              toast({ title: "Productos transferidos" })
              logAudit("transfer", `Mesa ${selectedTable.label} → ${transferTargetId} · ${toMove.length} líneas`)
            }}>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supervisor PIN */}
      <Dialog open={showSupervisorDialog} onOpenChange={setShowSupervisorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autorización de Supervisor</DialogTitle>
            <DialogDescription>{supervisorActionLabel}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>PIN de Supervisor</Label>
            <Input type="password" value={supervisorPinInput} onChange={(e) => setSupervisorPinInput(e.target.value)} />
            {supervisorError && <p className="text-xs text-destructive">{supervisorError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupervisorDialog(false)}>Cancelar</Button>
            <Button onClick={handleSupervisorVerify} disabled={supervisorLoading}>
              {supervisorLoading ? "Verificando..." : "Autorizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Close */}
      <Dialog open={showCashClose} onOpenChange={setShowCashClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Caja — Resumen del turno</DialogTitle>
            <DialogDescription>Revisa las ventas antes de cerrar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Resumen de ventas del turno */}
            <div className="grid grid-cols-2 gap-2">
              <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total vendido</div><div className="text-xl font-bold text-primary">Q{currentShift.totalSales.toFixed(2)}</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Órdenes</div><div className="text-xl font-bold">{currentShift.totalOrders}</div></CardContent></Card>
            </div>
            <div className="rounded-md border p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>💵 Efectivo</span><span className="font-medium text-green-600">Q{currentShift.paymentMethods.cash.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>💳 Tarjeta</span><span className="font-medium">Q{currentShift.paymentMethods.card.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>🔁 Transferencia</span><span className="font-medium">Q{currentShift.paymentMethods.transfer.toFixed(2)}</span></div>
            </div>

            {/* Productos vendidos (cuántos tacos, cuántas cocas, etc.) */}
            {Object.keys(currentShift.productsUsed).length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Productos vendidos</Label>
                <ScrollArea className="max-h-40 mt-1 rounded-md border">
                  <div className="p-2 space-y-0.5">
                    {Object.entries(currentShift.productsUsed).sort((a, b) => b[1] - a[1]).map(([nombre, cant]) => (
                      <div key={nombre} className="flex justify-between text-sm">
                        <span>{nombre}</span><span className="font-medium">{cant}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Arqueo de efectivo */}
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Efectivo esperado en caja:</span><span className="font-medium">Q{currentCash.toFixed(2)}</span></div>
              <Label>Efectivo físico (contado)</Label>
              <Input type="number" step="0.01" value={physicalCount} onChange={(e) => setPhysicalCount(Number(e.target.value))} />
              <div className="flex justify-between text-sm"><span>Diferencia:</span>
                <span className={`font-medium ${physicalCount - currentCash === 0 ? "text-green-600" : "text-destructive"}`}>
                  Q{(physicalCount - currentCash).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCashClose(false)}>Cancelar</Button>
            <Button onClick={startInventoryCount} disabled={conteoLoading}>
              {conteoLoading ? "Cargando…" : "Continuar al conteo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conteo de inventario (obligatorio antes de cerrar el turno) */}
      <Dialog open={showInventoryCount} onOpenChange={(o) => { if (!conteoSaving) setShowInventoryCount(o) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Conteo de inventario</DialogTitle>
            <DialogDescription>
              Cuenta el producto físico para cerrar el turno. Encontré + Ingreso − Quedó = consumido; la merma se compara con lo vendido.
            </DialogDescription>
          </DialogHeader>
          {conteoItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay insumos para contar en esta sucursal.</p>
          ) : (
            <ScrollArea className="flex-1 -mx-2 px-2">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2">Insumo</th>
                    <th className="w-20 text-center">Encontré</th>
                    <th className="w-20 text-center">Ingreso</th>
                    <th className="w-16 text-center">Vendido</th>
                    <th className="w-20 text-center">Quedó</th>
                    <th className="w-24 text-right">Merma</th>
                  </tr>
                </thead>
                <tbody>
                  {conteoItems.map((r) => {
                    const consumido = (Number(r.encontreStr) || 0) + (Number(r.ingresoStr) || 0) - (Number(r.quedoStr) || 0)
                    const merma = consumido - r.vendidoTeorico
                    return (
                      <tr key={r.insumoId} className="border-b border-border/50">
                        <td className="py-1.5">{r.nombre} <span className="text-xs text-muted-foreground">({r.unidad})</span></td>
                        <td><Input type="number" step="0.01" className="h-8 text-center" value={r.encontreStr}
                          onChange={(e) => setConteoField(r.insumoId, "encontreStr", e.target.value)} /></td>
                        <td><Input type="number" step="0.01" className="h-8 text-center" value={r.ingresoStr}
                          onChange={(e) => setConteoField(r.insumoId, "ingresoStr", e.target.value)} /></td>
                        <td className="text-center text-muted-foreground" title="Vendido en el turno (según recetas)">{r.vendidoTeorico}</td>
                        <td><Input type="number" step="0.01" className="h-8 text-center" value={r.quedoStr}
                          onChange={(e) => setConteoField(r.insumoId, "quedoStr", e.target.value)} /></td>
                        <td className={`text-right font-medium ${Math.abs(merma) > 0.001 ? "text-destructive" : "text-green-600"}`}>
                          {merma.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </ScrollArea>
          )}
          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => { setShowInventoryCount(false); setShowCashClose(true) }} disabled={conteoSaving}>Atrás</Button>
            <Button onClick={confirmInventoryCount} disabled={conteoSaving}>
              {conteoSaving ? "Guardando…" : "Confirmar y cerrar turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cash Move */}
      <Dialog open={showCashMove} onOpenChange={setShowCashMove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimiento de Efectivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant={cashMoveType === "entrada" ? "default" : "outline"} onClick={() => setCashMoveType("entrada")}>Entrada</Button>
              <Button variant={cashMoveType === "retiro" ? "default" : "outline"} onClick={() => setCashMoveType("retiro")}>Retiro</Button>
            </div>
            <div><Label>Monto</Label><Input type="number" step="0.01" value={cashMoveAmount} onChange={(e) => setCashMoveAmount(Number(e.target.value))} /></div>
            <div><Label>Motivo</Label><Input value={cashMoveReason} onChange={(e) => setCashMoveReason(e.target.value)} placeholder="Ej: cambio, pago proveedor" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCashMove(false)}>Cancelar</Button>
            <Button onClick={registerCashMove} disabled={cashMoveAmount <= 0 || !cashMoveReason.trim()}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reports */}
      <Dialog open={showReportsDialog} onOpenChange={setShowReportsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reportes del Turno</DialogTitle>
            <DialogDescription>
              Cajero: {currentShift.userName} · Inicio: {currentShift.startTime.toLocaleString()}
              {currentShift.endTime ? ` · Fin: ${currentShift.endTime.toLocaleString()}` : " · En curso"}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="sales" className="mt-2">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="sales" className="text-xs">Ventas</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs">Métodos Pago</TabsTrigger>
              <TabsTrigger value="products" className="text-xs">Productos</TabsTrigger>
              <TabsTrigger value="categories" className="text-xs">Categorías</TabsTrigger>
              <TabsTrigger value="cancellations" className="text-xs">Anulaciones</TabsTrigger>
              <TabsTrigger value="discounts" className="text-xs">Descuentos</TabsTrigger>
              <TabsTrigger value="waiters" className="text-xs">Meseros</TabsTrigger>
              <TabsTrigger value="reprint" className="text-xs">Reimprimir</TabsTrigger>
              <TabsTrigger value="audit" className="text-xs">Auditoría</TabsTrigger>
            </TabsList>

            {/* ── 1. Ventas del turno ── */}
            <TabsContent value="sales" className="space-y-4 mt-3">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                  const avg = currentShift.totalOrders > 0 ? (currentShift.totalSales / currentShift.totalOrders).toFixed(2) : "0.00"
                  const totalDisc = payments.reduce((s, p) => s + (p.discountAmount || 0), 0)
                  const lines: string[] = [
                    `Total Ventas | Q${currentShift.totalSales.toFixed(2)}`,
                    `Órdenes | ${currentShift.totalOrders}`,
                    `Ticket Promedio | Q${avg}`,
                    `Descuentos | Q${totalDisc.toFixed(2)}`,
                    "---", "## Ventas por Hora",
                  ]
                  const hourMap: Record<number, { count: number; total: number }> = {}
                  payments.forEach((p) => { const h = p.timestamp.getHours(); if (!hourMap[h]) hourMap[h] = { count: 0, total: 0 }; hourMap[h].count++; hourMap[h].total += p.amount })
                  Object.keys(hourMap).map(Number).sort((a, b) => a - b).forEach((h) => {
                    lines.push(`${String(h).padStart(2, "0")}:00  ${hourMap[h].count} ord. | Q${hourMap[h].total.toFixed(2)}`)
                  })
                  triggerPrintReport("REPORTE DE VENTAS", lines)
                }}><Printer className="w-3 h-3" />Imprimir</Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Ventas</div><div className="text-xl font-bold text-primary">Q{currentShift.totalSales.toFixed(2)}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Órdenes</div><div className="text-xl font-bold">{currentShift.totalOrders}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Ticket Promedio</div><div className="text-xl font-bold">Q{currentShift.totalOrders > 0 ? (currentShift.totalSales / currentShift.totalOrders).toFixed(2) : "0.00"}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Descuentos Totales</div><div className="text-xl font-bold text-orange-500">Q{payments.reduce((s, p) => s + (p.discountAmount || 0), 0).toFixed(2)}</div></CardContent></Card>
              </div>
              {/* Ventas por hora */}
              {(() => {
                const hourMap: Record<number, { count: number; total: number }> = {}
                payments.forEach((p) => {
                  const h = p.timestamp.getHours()
                  if (!hourMap[h]) hourMap[h] = { count: 0, total: 0 }
                  hourMap[h].count++
                  hourMap[h].total += p.amount
                })
                const hours = Object.keys(hourMap).map(Number).sort((a, b) => a - b)
                if (hours.length === 0) return null
                const maxTotal = Math.max(...hours.map((h) => hourMap[h].total))
                return (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Ventas por Hora</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      {hours.map((h) => (
                        <div key={h} className="flex items-center gap-2 text-sm">
                          <span className="w-14 text-muted-foreground text-right">{String(h).padStart(2, "0")}:00</span>
                          <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${(hourMap[h].total / maxTotal) * 100}%` }} />
                          </div>
                          <span className="w-24 text-right font-medium">Q{hourMap[h].total.toFixed(2)}</span>
                          <span className="w-16 text-right text-muted-foreground">{hourMap[h].count} ord.</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )
              })()}
            </TabsContent>

            {/* ── 2. Métodos de pago (corte de caja) ── */}
            <TabsContent value="payments" className="space-y-4 mt-3">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                  const lines = [
                    `Efectivo | Q${currentShift.paymentMethods.cash.toFixed(2)}`,
                    `Tarjeta | Q${currentShift.paymentMethods.card.toFixed(2)}`,
                    `Transferencia | Q${currentShift.paymentMethods.transfer.toFixed(2)}`,
                    "---",
                    `Total Ventas | Q${currentShift.totalSales.toFixed(2)}`,
                    `Efectivo en ventas | Q${currentShift.paymentMethods.cash.toFixed(2)}`,
                    `+ Caja inicial | Q${(currentCash - currentShift.paymentMethods.cash).toFixed(2)}`,
                    "---",
                    `Efectivo esperado | Q${currentCash.toFixed(2)}`,
                  ]
                  triggerPrintReport("CORTE DE CAJA", lines)
                }}><Printer className="w-3 h-3" />Imprimir</Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([["Efectivo", "cash", "text-green-600"], ["Tarjeta", "card", "text-blue-600"], ["Transferencia", "transfer", "text-purple-600"]] as const).map(([label, key, color]) => {
                  const total = currentShift.paymentMethods[key]
                  const pct = currentShift.totalSales > 0 ? ((total / currentShift.totalSales) * 100).toFixed(1) : "0.0"
                  return (
                    <Card key={key}><CardContent className="p-4 text-center">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className={`text-xl font-bold ${color}`}>Q{total.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{pct}%</div>
                    </CardContent></Card>
                  )
                })}
              </div>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-sm"><span>Total General</span><span className="font-bold">Q{currentShift.totalSales.toFixed(2)}</span></div>
                  <Separator />
                  <div className="flex justify-between text-sm"><span>Efectivo en ventas</span><span className="font-medium text-green-600">Q{currentShift.paymentMethods.cash.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span>+ Caja inicial</span><span>Q{(currentCash - currentShift.paymentMethods.cash).toFixed(2)}</span></div>
                  <Separator />
                  <div className="flex justify-between text-sm font-bold"><span>Efectivo esperado en caja</span><span>Q{currentCash.toFixed(2)}</span></div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── 3. Ventas por producto ── */}
            <TabsContent value="products" className="mt-3">
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                  const prodMap: Record<string, { name: string; qty: number; total: number }> = {}
                  payments.forEach((p) => p.items.forEach((i) => {
                    const key = i.id || i.name
                    if (!prodMap[key]) prodMap[key] = { name: i.name, qty: 0, total: 0 }
                    prodMap[key].qty += i.quantity; prodMap[key].total += i.price * i.quantity
                  }))
                  const prods = Object.values(prodMap).sort((a, b) => b.total - a.total)
                  const lines: string[] = []
                  prods.forEach((p) => lines.push(`${p.qty}x ${p.name} | Q${p.total.toFixed(2)}`))
                  lines.push("---")
                  lines.push(`TOTAL ${prods.reduce((s, p) => s + p.qty, 0)} uds. | Q${prods.reduce((s, p) => s + p.total, 0).toFixed(2)}`)
                  triggerPrintReport("VENTAS POR PRODUCTO", lines)
                }}><Printer className="w-3 h-3" />Imprimir</Button>
              </div>
              <ScrollArea className="h-[400px]">
                {(() => {
                  const prodMap: Record<string, { name: string; qty: number; unitPrice: number; total: number }> = {}
                  payments.forEach((p) => p.items.forEach((i) => {
                    const key = i.id || i.name
                    if (!prodMap[key]) prodMap[key] = { name: i.name, qty: 0, unitPrice: i.price, total: 0 }
                    prodMap[key].qty += i.quantity
                    prodMap[key].total += i.price * i.quantity
                  }))
                  const products = Object.values(prodMap).sort((a, b) => b.total - a.total)
                  const grandTotal = products.reduce((s, p) => s + p.total, 0)
                  if (products.length === 0) return <p className="text-center text-muted-foreground py-8">Sin ventas registradas</p>
                  return (
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-muted-foreground">
                        <th className="py-2">Producto</th><th className="text-right">Cant.</th><th className="text-right">P. Unit.</th><th className="text-right">Total</th><th className="text-right">%</th>
                      </tr></thead>
                      <tbody>
                        {products.map((p) => (
                          <tr key={p.name} className="border-b">
                            <td className="py-1.5">{p.name}</td>
                            <td className="text-right">{p.qty}</td>
                            <td className="text-right">Q{p.unitPrice.toFixed(2)}</td>
                            <td className="text-right font-medium">Q{p.total.toFixed(2)}</td>
                            <td className="text-right text-muted-foreground">{grandTotal > 0 ? ((p.total / grandTotal) * 100).toFixed(1) : "0"}%</td>
                          </tr>
                        ))}
                        <tr className="font-bold">
                          <td className="py-2">TOTAL</td>
                          <td className="text-right">{products.reduce((s, p) => s + p.qty, 0)}</td>
                          <td></td>
                          <td className="text-right">Q{grandTotal.toFixed(2)}</td>
                          <td className="text-right">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  )
                })()}
              </ScrollArea>
            </TabsContent>

            {/* ── 4. Ventas por categoría ── */}
            <TabsContent value="categories" className="mt-3">
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                  const catMap: Record<string, { qty: number; total: number }> = {}
                  payments.forEach((p) => p.items.forEach((i) => {
                    const cat = i.category || "Sin categoría"
                    if (!catMap[cat]) catMap[cat] = { qty: 0, total: 0 }
                    catMap[cat].qty += i.quantity; catMap[cat].total += i.price * i.quantity
                  }))
                  const cats = Object.entries(catMap).sort(([, a], [, b]) => b.total - a.total)
                  const lines: string[] = []
                  cats.forEach(([cat, d]) => lines.push(`${cat} (${d.qty}) | Q${d.total.toFixed(2)}`))
                  lines.push("---")
                  lines.push(`TOTAL | Q${cats.reduce((s, [, c]) => s + c.total, 0).toFixed(2)}`)
                  triggerPrintReport("VENTAS POR CATEGORÍA", lines)
                }}><Printer className="w-3 h-3" />Imprimir</Button>
              </div>
              <ScrollArea className="h-[400px]">
                {(() => {
                  const catMap: Record<string, { qty: number; total: number }> = {}
                  payments.forEach((p) => p.items.forEach((i) => {
                    const cat = i.category || "Sin categoría"
                    if (!catMap[cat]) catMap[cat] = { qty: 0, total: 0 }
                    catMap[cat].qty += i.quantity
                    catMap[cat].total += i.price * i.quantity
                  }))
                  const cats = Object.entries(catMap).sort(([, a], [, b]) => b.total - a.total)
                  const grandTotal = cats.reduce((s, [, c]) => s + c.total, 0)
                  if (cats.length === 0) return <p className="text-center text-muted-foreground py-8">Sin ventas registradas</p>
                  const maxVal = Math.max(...cats.map(([, c]) => c.total))
                  return (
                    <div className="space-y-3">
                      {cats.map(([cat, data]) => (
                        <div key={cat}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{cat}</span>
                            <span>Q{data.total.toFixed(2)} · {data.qty} uds. · {grandTotal > 0 ? ((data.total / grandTotal) * 100).toFixed(1) : "0"}%</span>
                          </div>
                          <div className="bg-muted rounded-full h-4 overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${(data.total / maxVal) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-bold text-sm">
                        <span>TOTAL</span>
                        <span>Q{grandTotal.toFixed(2)} · {cats.reduce((s, [, c]) => s + c.qty, 0)} uds.</span>
                      </div>
                    </div>
                  )
                })()}
              </ScrollArea>
            </TabsContent>

            {/* ── 5. Anulaciones / Cancelaciones ── */}
            <TabsContent value="cancellations" className="mt-3">
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                  const cancels = auditLog.filter((a) => a.action === "order-cancel" || a.action === "order-remove-item")
                  const lines: string[] = [`Total: ${cancels.length} anulaciones`, "---"]
                  cancels.slice().reverse().forEach((a) => {
                    lines.push(`${a.timestamp.toLocaleTimeString()} ${a.action === "order-cancel" ? "ORDEN" : "ITEM"}`)
                    if (a.description) lines.push(`  ${a.description}`)
                    lines.push(`  Por: ${a.userName}`)
                  })
                  if (cancels.length === 0) lines.push("Sin anulaciones")
                  triggerPrintReport("ANULACIONES", lines)
                }}><Printer className="w-3 h-3" />Imprimir</Button>
              </div>
              <ScrollArea className="h-[400px]">
                {(() => {
                  const cancels = auditLog.filter((a) => a.action === "order-cancel" || a.action === "order-remove-item")
                  if (cancels.length === 0) return <p className="text-center text-muted-foreground py-8">Sin anulaciones en este turno</p>
                  return (
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-muted-foreground">
                        <th className="py-2">Fecha/Hora</th><th>Tipo</th><th>Detalle</th><th>Usuario</th>
                      </tr></thead>
                      <tbody>
                        {cancels.slice().reverse().map((a) => (
                          <tr key={a.id} className="border-b">
                            <td className="py-1.5 text-muted-foreground">{a.timestamp.toLocaleTimeString()}</td>
                            <td><Badge variant={a.action === "order-cancel" ? "destructive" : "outline"} className="text-xs">
                              {a.action === "order-cancel" ? "Orden cancelada" : "Item eliminado"}
                            </Badge></td>
                            <td>{a.description || "-"}</td>
                            <td>{a.userName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                })()}
              </ScrollArea>
            </TabsContent>

            {/* ── 6. Descuentos aplicados ── */}
            <TabsContent value="discounts" className="mt-3">
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                  const discounted = payments.filter((p) => (p.discountAmount || 0) > 0)
                  const totalDisc = discounted.reduce((s, p) => s + (p.discountAmount || 0), 0)
                  const lines: string[] = [`Órdenes: ${discounted.length}`, `Total Descontado | Q${totalDisc.toFixed(2)}`, "---"]
                  discounted.slice().reverse().forEach((p) => {
                    const sub = p.items.reduce((s, i) => s + i.price * i.quantity, 0)
                    lines.push(`Mesa ${p.tableNumber} | Sub: Q${sub.toFixed(2)}`)
                    lines.push(`Descuento | -Q${(p.discountAmount || 0).toFixed(2)}`)
                    lines.push(`Cobró: ${p.userName} ${p.timestamp.toLocaleTimeString()}`)
                    lines.push("---")
                  })
                  if (discounted.length === 0) lines.push("Sin descuentos")
                  triggerPrintReport("DESCUENTOS", lines)
                }}><Printer className="w-3 h-3" />Imprimir</Button>
              </div>
              <ScrollArea className="h-[400px]">
                {(() => {
                  const discounted = payments.filter((p) => (p.discountAmount || 0) > 0)
                  const totalDisc = discounted.reduce((s, p) => s + (p.discountAmount || 0), 0)
                  if (discounted.length === 0) return <p className="text-center text-muted-foreground py-8">Sin descuentos aplicados en este turno</p>
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Descontado</div><div className="text-lg font-bold text-orange-500">Q{totalDisc.toFixed(2)}</div></CardContent></Card>
                        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Órdenes con Descuento</div><div className="text-lg font-bold">{discounted.length}</div></CardContent></Card>
                        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Descuento Promedio</div><div className="text-lg font-bold">Q{(totalDisc / discounted.length).toFixed(2)}</div></CardContent></Card>
                      </div>
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-left text-muted-foreground">
                          <th className="py-2">Orden</th><th>Mesa</th><th className="text-right">Subtotal</th><th className="text-right">Descuento</th><th>Cobrado por</th><th>Hora</th>
                        </tr></thead>
                        <tbody>
                          {discounted.slice().reverse().map((p) => {
                            const sub = p.items.reduce((s, i) => s + i.price * i.quantity, 0)
                            return (
                              <tr key={p.id} className="border-b">
                                <td className="py-1.5 font-mono text-xs">{p.orderId}</td>
                                <td>{p.tableNumber}</td>
                                <td className="text-right">Q{sub.toFixed(2)}</td>
                                <td className="text-right font-medium text-orange-500">-Q{(p.discountAmount || 0).toFixed(2)}</td>
                                <td>{p.userName}</td>
                                <td className="text-muted-foreground">{p.timestamp.toLocaleTimeString()}</td>
                              </tr>
                            )
                          })}
                          <tr className="font-bold">
                            <td className="py-2" colSpan={3}>TOTAL</td>
                            <td className="text-right text-orange-500">-Q{totalDisc.toFixed(2)}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  )
                })()}
              </ScrollArea>
            </TabsContent>

            {/* ── 7. Ventas por mesero ── */}
            <TabsContent value="waiters" className="mt-3">
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                  const waiterMap: Record<string, { name: string; orders: number; total: number }> = {}
                  payments.forEach((p) => {
                    const wId = p.waiterId || p.userId
                    const wName = p.waiterName || p.userName
                    if (!waiterMap[wId]) waiterMap[wId] = { name: wName, orders: 0, total: 0 }
                    waiterMap[wId].orders++
                    waiterMap[wId].total += p.amount
                  })
                  const waitersData = Object.values(waiterMap).sort((a, b) => b.total - a.total)
                  const lines: string[] = [`Meseros: ${waitersData.length}`, "---"]
                  waitersData.forEach((w) => {
                    lines.push(`## ${w.name}`)
                    lines.push(`Órdenes: ${w.orders} | Q${w.total.toFixed(2)}`)
                    lines.push(`Promedio | Q${w.orders > 0 ? (w.total / w.orders).toFixed(2) : "0.00"}`)
                    lines.push("---")
                  })
                  if (waitersData.length === 0) lines.push("Sin ventas")
                  triggerPrintReport("VENTAS POR MESERO", lines)
                }}><Printer className="w-3 h-3" />Imprimir</Button>
              </div>
              <ScrollArea className="h-[400px]">
                {(() => {
                  const waiterMap: Record<string, { name: string; orders: number; total: number }> = {}
                  payments.forEach((p) => {
                    const wId = p.waiterId || p.userId
                    const wName = p.waiterName || p.userName
                    if (!waiterMap[wId]) waiterMap[wId] = { name: wName, orders: 0, total: 0 }
                    waiterMap[wId].orders++
                    waiterMap[wId].total += p.amount
                  })
                  const waitersData = Object.values(waiterMap).sort((a, b) => b.total - a.total)
                  if (waitersData.length === 0) return <p className="text-center text-muted-foreground py-8">Sin ventas registradas</p>
                  const maxSales = Math.max(...waitersData.map((w) => w.total))
                  return (
                    <div className="space-y-4">
                      {waitersData.map((w) => (
                        <Card key={w.name}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-medium">{w.name}</div>
                                <div className="text-xs text-muted-foreground">{w.orders} órdenes · Promedio: Q{w.orders > 0 ? (w.total / w.orders).toFixed(2) : "0.00"}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-primary">Q{w.total.toFixed(2)}</div>
                              </div>
                            </div>
                            <div className="bg-muted rounded-full h-3 overflow-hidden">
                              <div className="bg-primary h-full rounded-full" style={{ width: `${(w.total / maxSales) * 100}%` }} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )
                })()}
              </ScrollArea>
            </TabsContent>

            {/* ── Reimprimir ── */}
            <TabsContent value="reprint" className="mt-3">
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay tickets</p>
              ) : (
                <ScrollArea className="h-[350px]">
                  {payments.slice().reverse().map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b py-2">
                      <div>
                        <div className="text-sm font-medium">Mesa {p.tableNumber} · {p.orderId}</div>
                        <div className="text-xs text-muted-foreground">{p.timestamp.toLocaleString()}{p.waiterName ? ` · ${p.waiterName}` : ""}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">Q{p.amount.toFixed(2)}</span>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                          triggerPrintTicket({
                            kind: "payment", ticketId: p.orderId, timestamp: p.timestamp,
                            tableNumber: p.tableNumber, waiterName: p.waiterName || "-",
                            serviceType: "mesa", diners: 1, items: p.items,
                            discountAmount: p.discountAmount || 0, tenders: p.tenders, paidBy: p.userName,
                          })
                          setShowReportsDialog(false)
                        }}>Reimprimir</Button>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              )}
            </TabsContent>

            {/* ── Auditoría ── */}
            <TabsContent value="audit" className="mt-3">
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                  const lines: string[] = [`Eventos: ${auditLog.length}`, "---"]
                  auditLog.slice().reverse().forEach((a) => {
                    lines.push(`${a.timestamp.toLocaleTimeString()} | ${a.action}`)
                    if (a.description) lines.push(`  ${a.description}`)
                    lines.push(`  Por: ${a.userName}`)
                  })
                  if (auditLog.length === 0) lines.push("Sin eventos")
                  triggerPrintReport("AUDITORÍA", lines)
                }}><Printer className="w-3 h-3" />Imprimir</Button>
              </div>
              <ScrollArea className="h-[350px]">
                {auditLog.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin eventos</p>
                ) : (
                  <div className="space-y-2">{auditLog.slice().reverse().map((a) => (
                    <div key={a.id} className="flex justify-between border-b pb-1 text-sm">
                      <div><div className="font-medium">{a.action}</div>{a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}</div>
                      <div className="text-xs text-muted-foreground text-right"><div>{a.userName}</div><div>{a.timestamp.toLocaleTimeString()}</div></div>
                    </div>
                  ))}</div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
          <DialogFooter><Button onClick={() => setShowReportsDialog(false)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Billing (Facturación) */}
      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Facturación</DialogTitle>
            <DialogDescription>Pagos pendientes de factura y facturas emitidas</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">Pendientes ({payments.filter((p) => !p.invoiced).length})</TabsTrigger>
              <TabsTrigger value="invoiced">Facturadas ({invoices.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-3">
              <ScrollArea className="h-64">
                {payments.filter((p) => !p.invoiced).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Todo facturado</p>
                ) : (
                  <div className="space-y-2">
                    {payments.filter((p) => !p.invoiced).map((p) => (
                      <Card key={p.id}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">Mesa {p.tableNumber} · Q{p.amount.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">{p.timestamp.toLocaleString()}</div>
                          </div>
                          <Button size="sm" onClick={() => {
                            setCurrentPayment(p)
                            setInvoiceCustomerName("")
                            setInvoiceCustomerRFC("")
                            setShowBillingDialog(false)
                            setShowInvoiceDialog(true)
                          }}>Facturar</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="invoiced" className="mt-3">
              <ScrollArea className="h-64">
                {invoices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay facturas</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((inv) => (
                      <Card key={inv.id}>
                        <CardContent className="p-3">
                          <div className="flex justify-between">
                            <div><div className="text-sm font-medium">{inv.id}</div>
                              {inv.customerName && <div className="text-xs text-muted-foreground">{inv.customerName}</div>}
                              <div className="text-xs text-muted-foreground">{inv.timestamp.toLocaleString()}</div></div>
                            <div className="text-right"><div className="font-bold text-primary">Q{inv.total.toFixed(2)}</div>
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">Facturada</Badge></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
          <DialogFooter><Button onClick={() => setShowBillingDialog(false)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift close */}
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Cerrar Turno</DialogTitle>
            <DialogDescription>Resumen del turno</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Ventas</div><div className="text-xl font-bold text-primary">Q{currentShift.totalSales.toFixed(2)}</div></CardContent></Card>
              <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Órdenes</div><div className="text-xl font-bold">{currentShift.totalOrders}</div></CardContent></Card>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Efectivo:</span><span>Q{currentShift.paymentMethods.cash.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tarjeta:</span><span>Q{currentShift.paymentMethods.card.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Transferencia:</span><span>Q{currentShift.paymentMethods.transfer.toFixed(2)}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShiftDialog(false)}>Cancelar</Button>
            <Button onClick={() => { setShowShiftDialog(false); clearSession("pos"); clearActiveEstablecimiento("pos"); router.push("/pos/login") }}>Confirmar y Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>)
  }
}

