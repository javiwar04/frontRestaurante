"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Users,
  Clock,
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  CreditCard,
  DollarSign,
  FileText,
  BarChart3,
  LogOut,
  ClipboardList,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

interface Table {
  id: number
  number: number
  capacity: number
  status: "available" | "occupied" | "reserved"
  currentOrder?: Order
}

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  category: string
  modifiers?: Array<{ group: string; option: string; priceDelta: number }>
  notes?: string
  status?: "en_cocina" | "listo" | "entregado"
}

interface Order {
  id: string
  tableNumber: number
  items: OrderItem[]
  total: number
  startTime: Date
  status: "pendiente" | "en_cocina" | "servido" | "pagado"
  diners?: number
  serviceType?: "mesa" | "para_llevar" | "domicilio"
}

interface MenuItem {
  id: string
  name: string
  price: number
  category: string
}

interface Payment {
  id: string
  orderId: string
  tableNumber: number
  amount: number
  tenders: Array<{
    id: string
    method: "cash" | "card" | "transfer"
    amount: number
    cardBatch?: string
    transferRef?: string
  }>
  timestamp: Date
  userId: string
  userName: string
  invoiced: boolean
  items: OrderItem[]
  waiterId?: string
  waiterName?: string
}

interface Invoice {
  id: string
  paymentId: string
  tableNumber: number
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  timestamp: Date
  customerName?: string
  customerRFC?: string
}

interface ShiftReport {
  shiftId: string
  userId: string
  userName: string
  startTime: Date
  endTime?: Date
  totalSales: number
  totalOrders: number
  paymentMethods: {
    cash: number
    card: number
    transfer: number
  }
  productsUsed: { [key: string]: number }
}

type Role = "cajero" | "mesero" | "supervisor"

interface AuditEntry {
  id: string
  timestamp: Date
  userId: string
  userName: string
  role: Role
  action: string
  description?: string
}

type TableAccount = {
  id: string
  label: string
  orderId: string
  startTime: number
  diners: number
  serviceType: "mesa" | "para_llevar" | "domicilio"
  status: "pendiente" | "en_cocina" | "servido" | "pagado"
  discountAmount: number
  deducted: boolean
  items: OrderItem[]
}

type SectorTableStatus = "available" | "occupied" | "reserved"
type SectorTable = { id: number; label: string; seats: number; status: SectorTableStatus }
type Sector = { id: string; name: string; tables: SectorTable[] }

const initialSectors: Sector[] = [
  {
    id: "rest",
    name: "Restaurante",
    tables: [
      { id: 101, label: "R1", seats: 4, status: "available" },
      { id: 102, label: "R2", seats: 6, status: "occupied" },
      { id: 103, label: "R3", seats: 4, status: "available" },
      { id: 104, label: "R4", seats: 2, status: "reserved" },
    ],
  },
  {
    id: "bar",
    name: "Bar",
    tables: [
      { id: 201, label: "B1", seats: 2, status: "available" },
      { id: 202, label: "B2", seats: 2, status: "occupied" },
      { id: 203, label: "B3", seats: 4, status: "available" },
    ],
  },
  {
    id: "perg",
    name: "Pérgola",
    tables: [
      { id: 301, label: "P1", seats: 6, status: "available" },
      { id: 302, label: "P2", seats: 8, status: "available" },
    ],
  },
]

export default function POSPage() {
  const router = useRouter()

  const [sessionReady, setSessionReady] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: Role }>({
    id: "",
    name: "",
    role: "cajero",
  })
  const [currentShift, setCurrentShift] = useState<ShiftReport>({
    shiftId: `SHIFT-${Date.now()}`,
    userId: "",
    userName: "",
    startTime: new Date(),
    totalSales: 0,
    totalOrders: 0,
    paymentMethods: { cash: 0, card: 0, transfer: 0 },
    productsUsed: {},
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem("module_session_pos")
      if (!raw) {
        setSessionReady(false)
        router.replace("/pos/login")
        return
      }
      const session = JSON.parse(raw) as { username?: string; role?: Role }
      const username = session.username || "Usuario"
      const role: Role = session.role || (username === "mesero" ? "mesero" : "cajero")
      setCurrentUser({ id: `user-${username}`, name: username, role })
      setCurrentShift({
        shiftId: `SHIFT-${Date.now()}`,
        userId: `user-${username}`,
        userName: username,
        startTime: new Date(),
        totalSales: 0,
        totalOrders: 0,
        paymentMethods: { cash: 0, card: 0, transfer: 0 },
        productsUsed: {},
      })
      setSessionReady(true)
    } catch {
      setSessionReady(false)
      router.replace("/pos/login")
    }
  }, [router])

  const logoutPOS = () => {
    try {
      localStorage.removeItem("module_session_pos")
    } catch {
      // ignore
    }
    router.push("/pos/login")
  }

  const [sectors, setSectors] = useState<Sector[]>(initialSectors)
  const allSectorTables = useMemo(() => sectors.flatMap((s) => s.tables), [sectors])
  const updateSectorTableStatus = (tableId: number, status: SectorTableStatus) => {
    setSectors((prev) =>
      prev.map((s) => ({
        ...s,
        tables: s.tables.map((t) => (t.id === tableId ? { ...t, status } : t)),
      })),
    )
  }

  // New: start in tables-by-area view
  const [mode, setMode] = useState<"tables" | "app">("tables")
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)

  const MAX_ACCOUNTS_PER_TABLE = 5
  const [accountsByTable, setAccountsByTable] = useState<Record<number, TableAccount[]>>({})
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const isHydratingAccountRef = useRef(false)

  const createAccount = (tableId: number, seats: number, labelIndex: number): TableAccount => {
    const now = Date.now()
    return {
      id: `ACC-${tableId}-${now}-${Math.random().toString(36).slice(2, 6)}`,
      label: `Cuenta ${labelIndex}`,
      orderId: `TCK-${now}`,
      startTime: now,
      diners: seats,
      serviceType: "mesa",
      status: "pendiente",
      discountAmount: 0,
      deducted: false,
      items: [],
    }
  }

  // An "active" account is one that still has items to settle and isn't paid yet.
  const getActiveAccounts = (tableId: number) => (accountsByTable[tableId] || []).filter((a) => a.items.length > 0 && a.status !== "pagado")

  const closeAllDialogs = () => {
    setShowPaymentDialog(false)
    setShowInvoiceDialog(false)
    setShowDiscountDialog(false)
    setShowSplitDialog(false)
    setShowTransferDialog(false)
    setShowModifiersDialog(false)
  }

  const goToTables = () => {
    closeAllDialogs()
    setMode("tables")
    setSelectedTable(null)
    setSelectedAccountId(null)
  }

  const upsertSelectedAccountSnapshot = (partial?: Partial<TableAccount>) => {
    if (!selectedTable || !selectedAccountId) return
    const tableId = selectedTable.id
    setAccountsByTable((prev) => {
      const list = prev[tableId] || []
      const idx = list.findIndex((a) => a.id === selectedAccountId)
      if (idx === -1) return prev
      const nextAcc: TableAccount = {
        ...list[idx],
        orderId: orderId || list[idx].orderId,
        startTime: (orderStartTime ? orderStartTime.getTime() : list[idx].startTime) || list[idx].startTime,
        diners,
        serviceType,
        status: orderStatus,
        discountAmount,
        deducted: orderDeducted,
        items: currentOrder,
        ...(partial || {}),
      }
      const next = [...list]
      next[idx] = nextAcc
      return { ...prev, [tableId]: next }
    })
  }
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [showShiftDialog, setShowShiftDialog] = useState(false)
  const [showReportsDialog, setShowReportsDialog] = useState(false)
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null)

  type PaymentTenderDraft = {
    id: string
    method: "cash" | "card" | "transfer"
    amount: number
    cardBatch?: string
    transferRef?: string
  }
  const [paymentTendersDraft, setPaymentTendersDraft] = useState<PaymentTenderDraft[]>([])

  const [printTicket, setPrintTicket] = useState<{
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
  } | null>(null)

  const [payments, setPayments] = useState<Payment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [activeView, setActiveView] = useState<"pos" | "billing">("pos")
  const [orderDeducted, setOrderDeducted] = useState(false)
  // Order meta
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderStartTime, setOrderStartTime] = useState<Date | null>(null)
  const [diners, setDiners] = useState<number>(1)
  const [serviceType, setServiceType] = useState<"mesa" | "para_llevar" | "domicilio">("mesa")
  const [orderStatus, setOrderStatus] = useState<"pendiente" | "en_cocina" | "servido" | "pagado">("pendiente")
  // Totals/discounts
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [showDiscountDialog, setShowDiscountDialog] = useState(false)
  // Split bill
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [splitPeople, setSplitPeople] = useState(2)
  const [splitMode, setSplitMode] = useState<"equal" | "byItem">("equal")
  const [splitPayMethods, setSplitPayMethods] = useState<Record<number, "cash" | "card" | "transfer">>({})
  const [splitPaid, setSplitPaid] = useState<Record<number, boolean>>({})
  const [splitAssignments, setSplitAssignments] = useState<Record<string, number | "all">>({})
  // Transfer between tables
  const [ordersByTable, setOrdersByTable] = useState<Record<number, OrderItem[]>>({})
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [transferTargetId, setTransferTargetId] = useState<number | null>(null)
  const [transferQtyByIndex, setTransferQtyByIndex] = useState<Record<number, number>>({})
  const [transferProductName, setTransferProductName] = useState<string>("")

  // Roles & auditoría
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const supervisorPIN = "1234"
  const [showSupervisorDialog, setShowSupervisorDialog] = useState(false)
  const [supervisorPinInput, setSupervisorPinInput] = useState("")
  const [supervisorActionLabel, setSupervisorActionLabel] = useState("")
  const [pendingSupervisorAction, setPendingSupervisorAction] = useState<(() => void) | null>(null)
  const [supervisorError, setSupervisorError] = useState("")

  // New: simple cash register management for shift/caja
  const [cashOpen, setCashOpen] = useState(false)
  const [initialCash, setInitialCash] = useState(0)
  const [currentCash, setCurrentCash] = useState(0)
  const [showCashOpen, setShowCashOpen] = useState(false)
  const [showCashClose, setShowCashClose] = useState(false)
  const [showCashMove, setShowCashMove] = useState(false)
  const [cashMoveType, setCashMoveType] = useState<"entrada" | "retiro">("entrada")
  const [cashMoveAmount, setCashMoveAmount] = useState(0)
  const [cashMoveReason, setCashMoveReason] = useState("")
  const [physicalCount, setPhysicalCount] = useState(0)

  // Waiters (meseros) and assignment per table
  interface Waiter { id: string; name: string }
  const waiters: Waiter[] = [
    { id: "w-1", name: "Ana López" },
    { id: "w-2", name: "Carlos Gómez" },
    { id: "w-3", name: "María Ruiz" },
    { id: "w-4", name: "Pedro Sánchez" },
  ]
  const [tableWaiter, setTableWaiter] = useState<Record<number, string>>({})
  const [showAssignWaiter, setShowAssignWaiter] = useState(false)
  const [pendingAreaTable, setPendingAreaTable] = useState<{ id: number; label: string; seats: number } | null>(null)
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>("")

  const [selectedSectorId, setSelectedSectorId] = useState<string>(initialSectors[0].id)

  // New: enter POS app after selecting a table from areas
  const handleSelectAreaTable = (areaTable: { id: number; label: string; seats: number }) => {
    setPendingAreaTable(areaTable)
    const preSel = tableWaiter[areaTable.id] || ""
    setSelectedWaiterId(preSel)
    setShowAssignWaiter(true)
  }

  const confirmAssignWaiter = () => {
    if (!pendingAreaTable) return
    if (!selectedWaiterId) {
      toast({ title: "Seleccione un mesero", description: "Debe asignar un mesero a la mesa." })
      return
    }

    // Ensure table has accounts (up to 5) and pick one to work with
    const tableId = pendingAreaTable.id
    const seats = pendingAreaTable.seats
    const existingAccounts = accountsByTable[tableId] || []
    let nextAccounts = existingAccounts
    if (existingAccounts.length === 0) {
      nextAccounts = [createAccount(tableId, seats, 1)]
      setAccountsByTable((prev) => ({ ...prev, [tableId]: nextAccounts }))
    }
    // Prefer an unpaid account with items, else first account
    const preferred =
      nextAccounts.find((a) => a.status !== "pagado" && a.items.length > 0) ||
      nextAccounts.find((a) => a.status !== "pagado") ||
      nextAccounts[0]
    const mapped: Table = {
      id: pendingAreaTable.id,
      number: pendingAreaTable.id,
      capacity: pendingAreaTable.seats,
      status: "occupied" as const,
    }
    setSelectedTable(mapped)
    setTableWaiter((prev) => ({ ...prev, [mapped.id]: selectedWaiterId }))
    updateSectorTableStatus(mapped.id, "occupied")
    setShowAssignWaiter(false)
    setMode("app")

    // Load selected account into local state
    isHydratingAccountRef.current = true
    setSelectedAccountId(preferred.id)
    setOrderId(preferred.orderId)
    setOrderStartTime(new Date(preferred.startTime))
    setDiners(preferred.diners || seats)
    setServiceType(preferred.serviceType)
    setOrderStatus(preferred.status)
    setDiscountAmount(preferred.discountAmount)
    setOrderDeducted(preferred.deducted)
    setCurrentOrder(preferred.items)
    queueMicrotask(() => {
      isHydratingAccountRef.current = false
    })

    const waiter = waiters.find((w) => w.id === selectedWaiterId)
    logAudit("assign-waiter", `Mesa ${mapped.number} → ${waiter?.name || selectedWaiterId}`)
  }

  // Keep selected account snapshot in sync while working on a table
  useEffect(() => {
    if (isHydratingAccountRef.current) return
    if (!selectedTable || !selectedAccountId) return
    upsertSelectedAccountSnapshot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedTable?.id,
    selectedAccountId,
    currentOrder,
    orderId,
    orderStartTime,
    diners,
    serviceType,
    orderStatus,
    discountAmount,
    orderDeducted,
  ])

  // New: cash helpers
  const openCash = () => {
    setCashOpen(true)
    setCurrentCash(initialCash)
    setShowCashOpen(false)
    toast({ title: "Caja abierta", description: `Efectivo inicial: $${initialCash.toFixed(2)}` })
    logAudit("cash-open", `Inicial: $${initialCash.toFixed(2)}`)
  }
  const closeCash = () => {
    const diff = physicalCount - currentCash
    setShowCashClose(false)
    setCashOpen(false)
    toast({
      title: "Cierre de caja",
      description: `Sistema: $${currentCash.toFixed(2)} | Físico: $${physicalCount.toFixed(2)} | Diferencia: $${diff.toFixed(2)}`,
    })
    logAudit("cash-close", `Sistema $${currentCash.toFixed(2)} · Físico $${physicalCount.toFixed(2)} · Dif $${diff.toFixed(2)}`)
    setInitialCash(0)
    setPhysicalCount(0)
    setCurrentCash(0)
  }
  const registerCashMove = () => {
    if (!cashMoveReason.trim() || cashMoveAmount <= 0) return
    const exec = () => {
      setCurrentCash((prev) => (cashMoveType === "entrada" ? prev + cashMoveAmount : prev - cashMoveAmount))
      setShowCashMove(false)
      toast({
        title: cashMoveType === "entrada" ? "Entrada de efectivo" : "Retiro de efectivo",
        description: `$${cashMoveAmount.toFixed(2)} - ${cashMoveReason}`,
      })
      logAudit("cash-" + cashMoveType, `${cashMoveReason} · $${cashMoveAmount.toFixed(2)}`)
      setCashMoveAmount(0)
      setCashMoveReason("")
    }
    if (cashMoveType === "retiro") {
      requireSupervisor("Autorizar retiro de efectivo", exec)
      return
    }
    exec()
  }

  // Mock menu items
  const menuItems: MenuItem[] = [
    { id: "1", name: "Hamburguesa Clásica", price: 12.99, category: "Platos Principales" },
    { id: "2", name: "Pizza Margarita", price: 14.99, category: "Platos Principales" },
    { id: "3", name: "Ensalada César", price: 9.99, category: "Entradas" },
    { id: "4", name: "Pasta Carbonara", price: 13.99, category: "Platos Principales" },
    { id: "5", name: "Alitas de Pollo", price: 10.99, category: "Entradas" },
    { id: "6", name: "Coca Cola", price: 2.99, category: "Bebidas" },
    { id: "7", name: "Agua Mineral", price: 1.99, category: "Bebidas" },
    { id: "8", name: "Cerveza", price: 4.99, category: "Bebidas" },
    { id: "9", name: "Tiramisú", price: 6.99, category: "Postres" },
    { id: "10", name: "Helado", price: 5.99, category: "Postres" },
  ]

  const categories = ["Todos", "Platos Principales", "Entradas", "Bebidas", "Postres"]
  const [selectedCategory, setSelectedCategory] = useState("Todos")

  const filteredMenu = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "Todos" || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Inventory and recipes
  type IngredientStock = { name: string; stock: number; min: number }
  const [inventory, setInventory] = useState<Record<string, IngredientStock>>({
    bun: { name: "Pan", stock: 50, min: 10 },
    patty: { name: "Carne", stock: 40, min: 8 },
    lettuce: { name: "Lechuga", stock: 30, min: 6 },
    tomato: { name: "Tomate", stock: 30, min: 6 },
    dough: { name: "Masa", stock: 20, min: 5 },
    cheese: { name: "Queso", stock: 25, min: 5 },
    tomato_sauce: { name: "Salsa de tomate", stock: 20, min: 5 },
    chicken: { name: "Pollo", stock: 25, min: 5 },
    lettuce_mix: { name: "Mix ensalada", stock: 25, min: 5 },
    wings: { name: "Alitas", stock: 40, min: 8 },
    coke: { name: "Coca Cola", stock: 60, min: 10 },
    water: { name: "Agua", stock: 80, min: 20 },
    beer: { name: "Cerveza", stock: 70, min: 15 },
    tiramisu: { name: "Tiramisú", stock: 15, min: 5 },
    icecream: { name: "Helado", stock: 30, min: 10 },
  })

  type Recipe = Array<{ ingredient: string; qty: number }>
  const recipes: Record<string, Recipe> = {
    // MenuItem.id => ingredients
    "1": [
      { ingredient: "bun", qty: 1 },
      { ingredient: "patty", qty: 1 },
      { ingredient: "lettuce", qty: 1 },
      { ingredient: "tomato", qty: 1 },
    ],
    "2": [
      { ingredient: "dough", qty: 1 },
      { ingredient: "cheese", qty: 1 },
      { ingredient: "tomato_sauce", qty: 1 },
    ],
    "3": [
      { ingredient: "lettuce_mix", qty: 1 },
      { ingredient: "chicken", qty: 1 },
    ],
    "4": [
      { ingredient: "dough", qty: 1 },
      { ingredient: "cheese", qty: 1 },
    ],
    "5": [
      { ingredient: "wings", qty: 6 },
    ],
    "6": [
      { ingredient: "coke", qty: 1 },
    ],
    "7": [
      { ingredient: "water", qty: 1 },
    ],
    "8": [
      { ingredient: "beer", qty: 1 },
    ],
    "9": [
      { ingredient: "tiramisu", qty: 1 },
    ],
    "10": [
      { ingredient: "icecream", qty: 1 },
    ],
  }

  // Modifiers configuration
  type ModifierOption = { id: string; name: string; priceDelta?: number }
  type ModifierGroup = { id: string; name: string; type: "single" | "multiple"; options: ModifierOption[] }
  const modifierGroupsByCategory: Record<string, ModifierGroup[]> = {
    "Platos Principales": [
      { id: "term", name: "Término", type: "single", options: [
        { id: "1", name: "Poco cocido" },
        { id: "2", name: "Medio" },
        { id: "3", name: "Bien cocido" },
      ]},
      { id: "spice", name: "Picante", type: "single", options: [
        { id: "0", name: "Sin picante" },
        { id: "1", name: "Bajo" },
        { id: "2", name: "Medio" },
        { id: "3", name: "Alto" },
      ]},
      { id: "extras", name: "Extras", type: "multiple", options: [
        { id: "cheese_extra", name: "Queso extra", priceDelta: 1.5 },
        { id: "bacon", name: "Tocino", priceDelta: 2 },
      ]},
    ],
    Entradas: [
      { id: "spice", name: "Picante", type: "single", options: [
        { id: "0", name: "Sin picante" },
        { id: "1", name: "Bajo" },
        { id: "2", name: "Medio" },
        { id: "3", name: "Alto" },
      ]},
    ],
  }
  

  const needsModifiers = (item: MenuItem) => !!modifierGroupsByCategory[item.category]?.length

  // Modifiers dialog state
  const [showModifiersDialog, setShowModifiersDialog] = useState(false)
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null)
  const [pendingModifiers, setPendingModifiers] = useState<Record<string, string | string[]>>({})
  const [pendingNotes, setPendingNotes] = useState("")

  const resetPendingModifiers = () => setPendingModifiers({})
  const getModifiersPrice = (mods?: Array<{ group: string; option: string; priceDelta: number }>) =>
    (mods || []).reduce((sum, m) => sum + (m.priceDelta || 0), 0)

  // Inventory helpers
  const buildRequirementsForItem = (itemId: string, qty: number) => {
    const rec = recipes[itemId] || []
    const reqs: Record<string, number> = {}
    rec.forEach((r) => {
      reqs[r.ingredient] = (reqs[r.ingredient] || 0) + r.qty * qty
    })
    return reqs
  }
  const canFulfillRequirements = (reqs: Record<string, number>) =>
    Object.entries(reqs).every(([ing, needed]) => (inventory[ing]?.stock ?? 0) >= needed)
  const sumRequirements = (list: Record<string, number>[]) => {
    const total: Record<string, number> = {}
    list.forEach((r) => {
      Object.entries(r).forEach(([k, v]) => {
        total[k] = (total[k] || 0) + v
      })
    })
    return total
  }
  const tryDeductForOrder = (order: OrderItem[]) => {
    const reqsList = order.map((oi) => buildRequirementsForItem(oi.id, oi.quantity))
    const totalReqs = sumRequirements(reqsList)
    if (!canFulfillRequirements(totalReqs)) return false
    // Deduct
    setInventory((prev) => {
      const next = { ...prev }
      Object.entries(totalReqs).forEach(([ing, qty]) => {
        if (next[ing]) next[ing] = { ...next[ing], stock: next[ing].stock - qty }
      })
      return next
    })
    // Low stock alerts
    Object.entries(totalReqs).forEach(([ing]) => {
      const after = (inventory[ing]?.stock ?? 0) - (totalReqs[ing] || 0)
      const min = inventory[ing]?.min ?? 0
      if (after <= min) {
        toast({ title: "Alerta de inventario", description: `${inventory[ing]?.name || ing} próximo a agotarse.` })
      }
    })
    return true
  }

  const handleAddItem = (item: MenuItem) => {
    // Check inventory for +1 portion
    const reqs = buildRequirementsForItem(item.id, 1)
    if (!canFulfillRequirements(reqs)) {
      toast({ title: "Sin stock", description: `No hay inventario suficiente para ${item.name}.` })
      return
    }
    if (!orderStartTime) setOrderStartTime(new Date())
    // Always give chance to add observations (and modifiers if any)
    setPendingItem(item)
    resetPendingModifiers()
    setPendingNotes("")
    setShowModifiersDialog(true)
  }

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    if (delta > 0) {
      const reqs = buildRequirementsForItem(itemId, 1)
      if (!canFulfillRequirements(reqs)) {
        toast({ title: "Sin stock", description: "Inventario insuficiente para aumentar la cantidad." })
        return
      }
    }
    setCurrentOrder((prev) =>
      prev
        .map((item) => (item.id === itemId ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    )
  }

  const handleRemoveItem = (itemId: string) => {
    const exec = () => {
      const item = currentOrder.find((i) => i.id === itemId)
      setCurrentOrder(currentOrder.filter((item) => item.id !== itemId))
      logAudit("order-remove-item", item ? `${item.name}` : `item ${itemId}`)
    }
    // Cancelaciones requieren autorización
    requireSupervisor("Autorizar cancelación de item", exec)
  }

  const openSplitDialog = (people?: number) => {
    const n = people ?? splitPeople
    setSplitMode("equal")
    const methods: Record<number, "cash" | "card" | "transfer"> = {}
    const paid: Record<number, boolean> = {}
    for (let i = 1; i <= n; i++) { methods[i] = "cash"; paid[i] = false }
    setSplitPayMethods(methods)
    setSplitPaid(paid)
    const assignments: Record<string, number | "all"> = {}
    currentOrder.forEach(item => { assignments[item.id] = "all" })
    setSplitAssignments(assignments)
    setShowSplitDialog(true)
  }

  const resetSplitPeople = (n: number) => {
    const clamped = Math.max(2, Math.min(10, n))
    setSplitPeople(clamped)
    const methods: Record<number, "cash" | "card" | "transfer"> = {}
    const paid: Record<number, boolean> = {}
    for (let i = 1; i <= clamped; i++) { methods[i] = splitPayMethods[i] ?? "cash"; paid[i] = splitPaid[i] ?? false }
    setSplitPayMethods(methods)
    setSplitPaid(paid)
  }

  const splitPersonTotals = useMemo(() => {
    const TAX = 0.16
    // inline subtotal so this memo doesn't depend on a const defined below
    const sub = currentOrder.reduce((sum, item) => {
      const mods = item.modifiers?.reduce((s, m) => s + m.priceDelta, 0) ?? 0
      return sum + (item.price + mods) * item.quantity
    }, 0)
    const disc = Math.min(discountAmount, sub)
    const itemLines = currentOrder.map(item => ({
      id: item.id,
      lineTotal: (item.price + (item.modifiers?.reduce((s, m) => s + m.priceDelta, 0) ?? 0)) * item.quantity,
      assignment: splitAssignments[item.id] ?? "all"
    }))
    const equalPoolRaw = itemLines.filter(i => i.assignment === "all").reduce((s, i) => s + i.lineTotal, 0)
    const equalShare = equalPoolRaw / Math.max(1, splitPeople)
    const totals: Record<number, number> = {}
    for (let p = 1; p <= splitPeople; p++) {
      const assigned = itemLines.filter(i => i.assignment === p).reduce((s, i) => s + i.lineTotal, 0)
      const personRaw = assigned + equalShare
      const personDisc = sub > 0 ? (personRaw / sub) * disc : 0
      const taxable = Math.max(0, personRaw - personDisc)
      totals[p] = Math.round(taxable * (1 + TAX) * 100) / 100
    }
    return totals
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrder, splitPeople, splitAssignments, discountAmount])

  const calculateSubtotal = () => {
    return currentOrder.reduce((sum, item) => {
      const mods = getModifiersPrice(item.modifiers)
      return sum + (item.price + mods) * item.quantity
    }, 0)
  }

  const TAX_RATE = 0.16

  const getInvoiceBreakdownFromTotal = (total: number) => {
    const safeTotal = Number.isFinite(total) ? total : 0
    const subtotal = safeTotal / (1 + TAX_RATE)
    const tax = safeTotal - subtotal
    return { subtotal, tax, total: safeTotal }
  }

  const calculateTax = () => {
    const taxable = Math.max(0, calculateSubtotal() - discountAmount)
    return taxable * TAX_RATE
  }
  const calculateTotal = () => {
    return Math.max(0, calculateSubtotal() - discountAmount) + calculateTax()
  }

  const handleSendToKitchen = () => {
    if (selectedTable && currentOrder.length > 0) {
      // Deduct inventory if not already deducted
      if (!orderDeducted) {
        const ok = tryDeductForOrder(currentOrder)
        if (!ok) {
          toast({ title: "Stock insuficiente", description: "No se pudo enviar a cocina por falta de insumos." })
          return
        }
        setOrderDeducted(true)
      }
      // marcar items en cocina
      const itemsEnCocina = currentOrder.map((i) => ({ ...i, status: "en_cocina" as const }))
      updateSectorTableStatus(selectedTable.id, "occupied")
      // persist in the current account
      upsertSelectedAccountSnapshot({ items: itemsEnCocina, status: "en_cocina", deducted: true })
      logAudit("send-kitchen", `Mesa ${selectedTable.number} · ${currentOrder.length} items`)
      toast({ title: "Pedido enviado a cocina", description: `Mesa ${selectedTable.number}` })
      closeAllDialogs()
      setCurrentOrder([])
      setOrderDeducted(false)
      setOrderStatus("en_cocina")
      setOrdersByTable((prev) => {
        const cp = { ...prev }
        if (selectedTable) delete cp[selectedTable.id]
        return cp
      })
      // Volver automáticamente a la vista de áreas/mesas
      goToTables()
    }
  }

  const handlePayment = () => {
    if (selectedTable && currentOrder.length > 0) {
      const assignedWaiterId = selectedTable ? tableWaiter[selectedTable.id] : undefined
      if (!assignedWaiterId) {
        toast({ title: "Mesero no asignado", description: "Asigne un mesero a la mesa antes de cobrar." })
        return
      }
      if (currentUser.role === "mesero") {
        toast({ title: "Permiso denegado", description: "Solo cajero o supervisor pueden cobrar." })
        return
      }
      if (!cashOpen) {
        toast({ title: "Caja cerrada", description: "Abra la caja para poder cobrar." })
        return
      }

      const total = calculateTotal()
      setPaymentTendersDraft([
        {
          id: `td-${Date.now()}`,
          method: "cash",
          amount: Number(total.toFixed(2)),
        },
      ])
      setShowPaymentDialog(true)
    }
  }

  const handleCompletePayment = () => {
    if (selectedTable && currentOrder.length > 0) {
      if (!currentShift) return
      if (!orderDeducted) {
        const ok = tryDeductForOrder(currentOrder)
        if (!ok) {
          toast({ title: "Stock insuficiente", description: "No se puede cobrar por falta de inventario." })
          return
        }
        setOrderDeducted(true)
      }
      const assignedWaiterId = tableWaiter[selectedTable.id]
      const waiter = waiters.find((w) => w.id === assignedWaiterId)

      const tenders = paymentTendersDraft
        .map((t) => ({
          ...t,
          amount: Number((Number(t.amount) || 0).toFixed(2)),
          cardBatch: t.method === "card" ? (t.cardBatch || "").trim() || undefined : undefined,
          transferRef: t.method === "transfer" ? (t.transferRef || "").trim() || undefined : undefined,
        }))
        .filter((t) => t.amount > 0)

      if (tenders.length === 0) {
        toast({ title: "Pago inválido", description: "Agregue al menos un método de pago con monto." })
        return
      }

      const totalDue = Number(calculateTotal().toFixed(2))
      const tenderSum = Number(tenders.reduce((s, t) => s + t.amount, 0).toFixed(2))
      if (Math.abs(tenderSum - totalDue) > 0.01) {
        toast({
          title: "Monto no cuadra",
          description: `Total: $${totalDue.toFixed(2)} · Pagos: $${tenderSum.toFixed(2)}`,
        })
        return
      }

      const payment: Payment = {
        id: `PAY-${Date.now()}`,
        orderId: orderId || `ORD-${Date.now()}`,
        tableNumber: selectedTable.number,
        amount: calculateTotal(),
        tenders,
        timestamp: new Date(),
        userId: currentUser.id,
        userName: currentUser.name,
        invoiced: false,
        items: currentOrder.map((i) => ({ ...i })),
        waiterId: waiter?.id,
        waiterName: waiter?.name,
      }

      setPayments([...payments, payment])
      setCurrentPayment(null)

      // Update shift data
      const updatedShift = { ...currentShift }
      updatedShift.totalSales += payment.amount
      updatedShift.totalOrders += 1

      // Split by tender method
      tenders.forEach((t) => {
        updatedShift.paymentMethods[t.method] += t.amount
      })

      // Track products used
      currentOrder.forEach((item) => {
        if (updatedShift.productsUsed[item.name]) {
          updatedShift.productsUsed[item.name] += item.quantity
        } else {
          updatedShift.productsUsed[item.name] = item.quantity
        }
      })

      setCurrentShift(updatedShift)

      // Persist this account as paid (but keep the record)
      upsertSelectedAccountSnapshot({ status: "pagado" })

      // Liberar mesa solo si no quedan otras cuentas activas
      const remainingActive = getActiveAccounts(selectedTable.id)
        .filter((a) => a.id !== selectedAccountId)
        .some((a) => a.items.length > 0 && a.status !== "pagado")
      updateSectorTableStatus(selectedTable.id, remainingActive ? "occupied" : "available")

      setCurrentOrder([])
  setOrderDeducted(false)
      setSelectedTable(null)
      setOrderStatus("pagado")
      setOrdersByTable((prev) => {
        const cp = { ...prev }
        if (selectedTable) delete cp[selectedTable.id]
        return cp
      })

      // Cerrar diálogo de pago y notificar que quedó pendiente de factura
      setShowPaymentDialog(false)
      toast({
        title: "Pago procesado",
        description: "La cuenta quedó pendiente de factura en la pestaña Facturación.",
      })
      const tenderLabel = tenders.map((t) => (t.method === "cash" ? "Efectivo" : t.method === "card" ? "Tarjeta" : "Depósito")).join(" + ")
      logAudit("payment", `Mesa ${payment.tableNumber} · $${payment.amount.toFixed(2)} · ${tenderLabel}`)
      
      // Set print ticket state and print
      setPrintTicket({
        kind: "payment",
        ticketId: payment.orderId,
        timestamp: payment.timestamp,
        tableNumber: payment.tableNumber,
        waiterName: payment.waiterName || "-",
        serviceType: serviceType,
        diners: diners,
        items: payment.items,
        discountAmount: discountAmount,
        tenders: payment.tenders,
        paidBy: payment.userName,
      })
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.print()
          // Volver automáticamente a la vista de áreas/mesas después de imprimir
          setTimeout(() => goToTables(), 500)
        }
      }, 100)
    }
  }

  const handleGenerateInvoice = (customerName?: string, customerRFC?: string) => {
    if (currentPayment) {
      // currentPayment.amount ya es el total cobrado (incluye impuestos)
      const { subtotal, tax, total } = getInvoiceBreakdownFromTotal(currentPayment.amount)

      const invoice: Invoice = {
        id: `INV-${Date.now()}`,
        paymentId: currentPayment.id,
        tableNumber: currentPayment.tableNumber,
        items: currentPayment.items,
        subtotal,
        tax,
        total,
        timestamp: new Date(),
        customerName,
        customerRFC,
      }

      setInvoices([...invoices, invoice])

      // Mark payment as invoiced
      setPayments(payments.map((p) => (p.id === currentPayment.id ? { ...p, invoiced: true } : p)))

      setShowInvoiceDialog(false)
      setCurrentPayment(null)
      logAudit("invoice", `${invoice.id} · Mesa ${invoice.tableNumber} · $${invoice.total.toFixed(2)}`)
      toast({ title: "Factura generada", description: `${invoice.id} · Mesa ${invoice.tableNumber}` })
      // Volver a la vista de áreas/mesas
      goToTables()
    }
  }

  const handleSkipInvoice = () => {
    setShowInvoiceDialog(false)
    setCurrentPayment(null)
    // Volver a la vista de áreas/mesas si se omite la factura
    goToTables()
  }

  const handleCloseShift = () => {
    const updatedShift = {
      ...currentShift,
      endTime: new Date(),
    }
    setCurrentShift(updatedShift)
    setShowShiftDialog(true)
  }

  const logAudit = (action: string, description?: string) => {
    setAuditLog((prev) => [
      ...prev,
      {
        id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        timestamp: new Date(),
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        action,
        description,
      },
    ])
  }

  const requireSupervisor = (label: string, onApproved: () => void) => {
    if (currentUser.role === "supervisor") {
      onApproved()
      return
    }
    setSupervisorActionLabel(label)
    setPendingSupervisorAction(() => onApproved)
    setSupervisorPinInput("")
    setSupervisorError("")
    setShowSupervisorDialog(true)
  }

  const getTableStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      case "occupied":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "reserved":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getTableStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Disponible"
      case "occupied":
        return "Ocupada"
      case "reserved":
        return "Reservada"
      default:
        return status
    }
  }
  const safelyGetStatusText = (status: string) => getTableStatusText(status || "available")

  // Important: never return early before all hooks are declared.
  if (!sessionReady) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>
  }

  const PrintTicketView = (
    <div className="print-only print-ticket mx-auto text-xs text-black">
      <div className="p-3">
        <div className="text-center">
          <div className="font-bold text-base leading-tight">Restaurante</div>
          <div className="text-[10px] leading-tight">Dirección del local</div>
          <div className="text-[10px] leading-tight">Tel: (000) 000-0000</div>
        </div>

        <div className="my-2 border-t border-dashed border-black" />
        <div className="text-center font-bold">{printTicket?.kind === "payment" ? "RECIBO DE PAGO" : "CUENTA / TICKET"}</div>
        <div className="mt-1 flex items-start justify-between text-[11px]">
          <span>Ticket: {printTicket ? printTicket.ticketId : orderId || "-"}</span>
          <span>{(printTicket ? printTicket.timestamp : orderStartTime || new Date()).toLocaleString()}</span>
        </div>
        <div className="mt-1 text-[11px]">
          <div>Mesa: {printTicket ? printTicket.tableNumber ?? "-" : selectedTable ? selectedTable.number : "-"}</div>
          <div>
            Mesero:{" "}
            {printTicket
              ? printTicket.waiterName
              : selectedTable
                ? waiters.find((w) => w.id === (tableWaiter[selectedTable.id] || ""))?.name || "-"
                : "-"}
          </div>
          <div>
            Servicio:{" "}
            {(printTicket ? printTicket.serviceType : serviceType) === "mesa"
              ? "En mesa"
              : (printTicket ? printTicket.serviceType : serviceType) === "para_llevar"
                ? "Para llevar"
                : "Domicilio"}
          </div>
          <div>Comensales: {printTicket ? printTicket.diners : diners}</div>
          {printTicket?.kind === "payment" ? <div>Cajero: {printTicket.paidBy}</div> : null}
        </div>

        <div className="my-2 border-t border-dashed border-black" />
        <div className="space-y-1">
          {(printTicket ? printTicket.items : currentOrder).length === 0 ? (
            <div className="text-center text-[11px]">Sin items</div>
          ) : (
            (printTicket ? printTicket.items : currentOrder).map((item, idx) => {
              const unit = item.price + getModifiersPrice(item.modifiers)
              const line = unit * item.quantity
              return (
                <div key={idx} className="break-inside-avoid">
                  <div className="flex justify-between">
                    <span className="font-semibold">{item.quantity} x {item.name}</span>
                    <span>${line.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-black/70">
                    <span>Precio c/u: ${unit.toFixed(2)}</span>
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="pl-2 text-[10px]">
                      {item.modifiers.map((m, i) => (
                        <div key={i}>- {m.group}: {m.option}</div>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <div className="pl-2 italic text-[10px]">Obs: {item.notes}</div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="my-2 border-t border-dashed border-black" />
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>
              ${(printTicket 
                ? printTicket.items.reduce((sum, item) => sum + (item.price + getModifiersPrice(item.modifiers)) * item.quantity, 0) 
                : calculateSubtotal()).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Descuento</span>
            <span>- ${(printTicket ? printTicket.discountAmount : discountAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA (16%)</span>
            <span>
              ${(printTicket
                ? (printTicket.items.reduce((sum, item) => sum + (item.price + getModifiersPrice(item.modifiers)) * item.quantity, 0) - printTicket.discountAmount) * 0.16
                : calculateTax()).toFixed(2)}
            </span>
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>
              ${(printTicket
                ? (printTicket.items.reduce((sum, item) => sum + (item.price + getModifiersPrice(item.modifiers)) * item.quantity, 0) - printTicket.discountAmount) * 1.16
                : calculateTotal()).toFixed(2)}
            </span>
          </div>

          {printTicket?.kind === "payment" ? (
            <>
              <div className="border-t border-dashed border-black my-1" />
              <div className="font-bold">Forma de pago</div>
              <div className="space-y-0.5">
                {printTicket.tenders.map((t) => (
                  <div key={t.id} className="flex justify-between">
                    <span>
                      {t.method === "cash"
                        ? "Efectivo"
                        : t.method === "card"
                          ? `Tarjeta${t.cardBatch ? ` (Lote ${t.cardBatch})` : ""}`
                          : `Depósito${t.transferRef ? ` (No. ${t.transferRef})` : ""}`}
                    </span>
                    <span>${t.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="text-center mt-2 text-[10px]">Recibo no fiscal</div>
            </>
          ) : (
            <div className="text-center mt-2 text-[10px]">Precuenta no fiscal</div>
          )}
        </div>

        <div className="my-2 border-t border-dashed border-black" />
        <div className="text-center text-[10px]">¡Gracias por su preferencia!</div>
      </div>
    </div>
  )

  // Tables-by-area landing view
  if (mode === "tables") {
    const sector = sectors.find((s) => s.id === selectedSectorId)!
    return (
      <>
      <div className="min-h-screen bg-background no-print">
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">Punto de Venta</h1>
                  <p className="text-sm text-muted-foreground">Seleccione un área y una mesa</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  Turno: {currentUser.name}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Users className="w-3 h-3" />
                  {allSectorTables.filter((t) => t.status === "occupied").length}/{allSectorTables.length} Ocupadas
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Caja
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Gestión de Caja</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {!cashOpen ? (
                      <DropdownMenuItem onClick={() => {
                        if (currentUser.role === "mesero") { toast({ title: "Permiso denegado", description: "Solo cajero o supervisor pueden abrir caja." }); return }
                        setShowCashOpen(true)
                      }}>
                        Abrir Caja
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => {
                          if (currentUser.role === "mesero") { toast({ title: "Permiso denegado", description: "Solo cajero o supervisor pueden mover caja." }); return }
                          setShowCashMove(true)
                        }}>Movimiento de efectivo</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          if (currentUser.role === "mesero") { toast({ title: "Permiso denegado", description: "Solo cajero o supervisor pueden cerrar caja." }); return }
                          setShowCashClose(true)
                        }}>Cerrar Caja</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button size="sm" onClick={handleCloseShift}>
                  <Clock className="w-4 h-4 mr-2" />
                  Cerrar Turno
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowReportsDialog(true)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Reportes
                </Button>
                <Button variant="ghost" size="sm" onClick={logoutPOS}>
                  <LogOut className="w-4 h-4 mr-1" />
                  Salir
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <Tabs value={selectedSectorId} onValueChange={setSelectedSectorId}>
            <TabsList className="grid grid-cols-3 w-full mb-6">
              {sectors.map((s) => (
                <TabsTrigger key={s.id} value={s.id} className="text-sm">
                  {s.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {sectors.map((s) => (
              <TabsContent key={s.id} value={s.id}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {s.tables.map((t) => (
                    <Card
                      key={t.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        t.status === "available"
                          ? "border-green-500/40 bg-green-500/10"
                          : t.status === "occupied"
                            ? "border-red-500/40 bg-red-500/10"
                            : "border-yellow-500/40 bg-yellow-500/10"
                      }`}
                      onClick={() => t.status !== "reserved" && handleSelectAreaTable(t)}
                    >
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-xl font-bold mb-1">Mesa {t.label}</div>
                          <div className="text-xs mb-2">
                            <Users className="w-3 h-3 inline mr-1" />
                            {t.seats} personas
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {t.status === "available" ? "Disponible" : t.status === "occupied" ? "Ocupada" : "Reservada"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </main>

        {/* Cash dialogs */}
        <Dialog open={showCashOpen} onOpenChange={setShowCashOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abrir Caja</DialogTitle>
              <DialogDescription>Ingrese el conteo inicial de efectivo</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Efectivo inicial</Label>
              <Input type="number" step="0.01" value={initialCash} onChange={(e) => setInitialCash(Number(e.target.value))} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCashOpen(false)}>Cancelar</Button>
              <Button onClick={openCash} disabled={initialCash < 0}>Abrir Caja</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Discount Dialog */}
        <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aplicar descuento</DialogTitle>
              <DialogDescription>Ingrese un monto fijo a descontar del subtotal</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Monto del descuento</Label>
              <Input type="number" step="0.01" value={discountAmount}
                     onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDiscountDialog(false)}>Cancelar</Button>
              <Button onClick={() => setShowDiscountDialog(false)}>Aplicar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Split Bill Dialog */}
        <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Dividir cuenta</DialogTitle>
              <DialogDescription>Reparte el total entre varias personas</DialogDescription>
            </DialogHeader>

            {/* Mode selector */}
            <div className="flex gap-2">
              <Button
                variant={splitMode === "equal" ? "default" : "outline"}
                size="sm" className="flex-1"
                onClick={() => setSplitMode("equal")}
              >Partes iguales</Button>
              <Button
                variant={splitMode === "byItem" ? "default" : "outline"}
                size="sm" className="flex-1"
                onClick={() => setSplitMode("byItem")}
              >Por ítem</Button>
            </div>

            {/* People counter */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Personas:</span>
              <Button variant="outline" size="icon" className="h-7 w-7"
                onClick={() => resetSplitPeople(splitPeople - 1)}
                disabled={splitPeople <= 2}
              ><Minus className="h-3 w-3" /></Button>
              <span className="w-6 text-center font-bold">{splitPeople}</span>
              <Button variant="outline" size="icon" className="h-7 w-7"
                onClick={() => resetSplitPeople(splitPeople + 1)}
                disabled={splitPeople >= 10}
              ><Plus className="h-3 w-3" /></Button>
              <span className="ml-auto text-sm text-muted-foreground">Total: <strong>${calculateTotal().toFixed(2)}</strong></span>
            </div>

            <Separator />

            {splitMode === "equal" ? (
              /* ── Equal mode ── */
              <div className="space-y-2">
                {Array.from({ length: splitPeople }, (_, i) => i + 1).map(p => (
                  <div key={p} className="flex items-center gap-2 rounded-lg border p-2">
                    <span className="text-sm font-medium w-20">Persona {p}</span>
                    <span className="font-bold text-primary flex-1">${splitPersonTotals[p]?.toFixed(2) ?? "0.00"}</span>
                    <select
                      className="text-xs border rounded px-1 py-0.5 bg-background"
                      value={splitPayMethods[p] ?? "cash"}
                      onChange={e => setSplitPayMethods(prev => ({ ...prev, [p]: e.target.value as "cash" | "card" | "transfer" }))}
                      disabled={splitPaid[p]}
                    >
                      <option value="cash">Efectivo</option>
                      <option value="card">Tarjeta</option>
                      <option value="transfer">Transfer.</option>
                    </select>
                    {splitPaid[p] ? (
                      <Badge variant="default" className="bg-green-600 text-white text-xs">Cobrado</Badge>
                    ) : (
                      <Button size="sm" className="h-6 text-xs px-2"
                        onClick={() => setSplitPaid(prev => ({ ...prev, [p]: true }))}
                      >Cobrar</Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* ── By item mode ── */
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Asigna cada ítem a una persona o déjalo como "Todos" para repartirlo equitativamente.</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {currentOrder.map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-sm py-1">
                      <span className="flex-1 truncate">{item.name} ×{item.quantity}</span>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        ${((item.price + (item.modifiers?.reduce((s, m) => s + m.priceDelta, 0) ?? 0)) * item.quantity).toFixed(2)}
                      </span>
                      <select
                        className="text-xs border rounded px-1 py-0.5 bg-background w-24"
                        value={splitAssignments[item.id] === "all" ? "all" : String(splitAssignments[item.id] ?? "all")}
                        onChange={e => setSplitAssignments(prev => ({ ...prev, [item.id]: e.target.value === "all" ? "all" : Number(e.target.value) }))}
                      >
                        <option value="all">Todos</option>
                        {Array.from({ length: splitPeople }, (_, i) => i + 1).map(p => (
                          <option key={p} value={p}>Persona {p}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <Separator />
                {/* Summary per person */}
                <div className="space-y-1">
                  {Array.from({ length: splitPeople }, (_, i) => i + 1).map(p => (
                    <div key={p} className="flex items-center gap-2 rounded border p-2">
                      <span className="text-sm font-medium w-20">Persona {p}</span>
                      <span className="font-bold text-primary flex-1">${splitPersonTotals[p]?.toFixed(2) ?? "0.00"}</span>
                      <select
                        className="text-xs border rounded px-1 py-0.5 bg-background"
                        value={splitPayMethods[p] ?? "cash"}
                        onChange={e => setSplitPayMethods(prev => ({ ...prev, [p]: e.target.value as "cash" | "card" | "transfer" }))}
                        disabled={splitPaid[p]}
                      >
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transfer.</option>
                      </select>
                      {splitPaid[p] ? (
                        <Badge variant="default" className="bg-green-600 text-white text-xs">Cobrado</Badge>
                      ) : (
                        <Button size="sm" className="h-6 text-xs px-2"
                          onClick={() => setSplitPaid(prev => ({ ...prev, [p]: true }))}
                        >Cobrar</Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <div className="text-xs text-muted-foreground text-center">
                {Object.values(splitPaid).filter(Boolean).length} / {splitPeople} cobrado(s)
              </div>
              {Object.values(splitPaid).filter(Boolean).length === splitPeople && (
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => { setShowSplitDialog(false) }}>
                  Cerrar cuenta completa
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => setShowSplitDialog(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Items Dialog */}
        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Transferir productos a otra mesa</DialogTitle>
              <DialogDescription>Seleccione mesa destino y qué productos transferir</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Mesa destino</Label>
                <Select value={transferTargetId ? String(transferTargetId) : ""} onValueChange={(v) => setTransferTargetId(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione mesa" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.flatMap(s => s.tables).filter(t => t.id !== selectedTable?.id).map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.label} · {safelyGetStatusText(t.status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Producto</Label>
                <Select
                  value={transferProductName}
                  onValueChange={(v) => {
                    setTransferProductName(v)
                    setTransferQtyByIndex({})
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los productos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {Array.from(new Set(currentOrder.map(i => i.name))).map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {currentOrder.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No hay productos</div>
                ) : (
                  currentOrder
                    .map((it, idx) => ({ it, idx }))
                    .filter(({ it }) => !transferProductName || it.name === transferProductName)
                    .map(({ it, idx }) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{it.name}</div>
                        <div className="text-[11px] text-muted-foreground">Cant. actual: {it.quantity}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Mover</Label>
                        <Input
                          type="number"
                          className="h-8 w-20"
                          min={0}
                          max={it.quantity}
                          value={transferQtyByIndex[idx] ?? 0}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(Number(e.target.value) || 0, it.quantity))
                            setTransferQtyByIndex(prev => ({ ...prev, [idx]: val }))
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
              {currentOrder.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTransferQtyByIndex(prev => {
                        const next: Record<number, number> = { ...prev }
                        currentOrder.forEach((it, idx) => {
                          if (!transferProductName || it.name === transferProductName) {
                            next[idx] = it.quantity
                          }
                        })
                        return next
                      })
                    }}
                  >
                    Seleccionar todo (producto)
                  </Button>
                  <Button variant="ghost" onClick={() => setTransferQtyByIndex({})}>Limpiar</Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Cancelar</Button>
              <Button
                onClick={() => {
                  if (!selectedTable || !transferTargetId) { toast({ title: "Seleccione mesa destino" }); return }
                  const toMove: OrderItem[] = []
                  const remain: OrderItem[] = []
                  currentOrder.forEach((it, idx) => {
                    if (transferProductName && it.name !== transferProductName) {
                      remain.push(it)
                      return
                    }
                    const qty = transferQtyByIndex[idx] || 0
                    if (qty > 0) {
                      toMove.push({ ...it, quantity: qty })
                    }
                    const leftover = it.quantity - qty
                    if (leftover > 0) remain.push({ ...it, quantity: leftover })
                  })
                  if (toMove.length === 0) { toast({ title: "Nada para transferir" }); return }
                  setOrdersByTable(prev => ({
                    ...prev,
                    [transferTargetId]: [ ...(prev[transferTargetId] || []), ...toMove ],
                  }))
                  updateSectorTableStatus(transferTargetId, "occupied")
                  // Copiar mesero de la mesa origen a la mesa destino (si existe)
                  if (selectedTable) {
                    const waiterIdSrc = tableWaiter[selectedTable.id]
                    if (waiterIdSrc) {
                      setTableWaiter(prev => (
                        prev[transferTargetId] === waiterIdSrc
                          ? prev
                          : { ...prev, [transferTargetId]: waiterIdSrc }
                      ))
                    }
                  }
                  setCurrentOrder(remain)
                  setShowTransferDialog(false)
                  toast({ title: "Productos transferidos", description: `A mesa ${transferTargetId}` })
                  logAudit("order-transfer", `Mesa ${selectedTable.number} → Mesa ${transferTargetId} · ${toMove.length} líneas`)
                }}
              >
                Transferir
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (!selectedTable || !transferTargetId) { toast({ title: "Seleccione mesa destino" }); return }
                  if (currentOrder.length === 0) { toast({ title: "Nada para transferir" }); return }
                  const toMove = [...currentOrder]
                  setOrdersByTable(prev => ({
                    ...prev,
                    [transferTargetId]: [ ...(prev[transferTargetId] || []), ...toMove ],
                  }))
                  updateSectorTableStatus(transferTargetId, "occupied")
                  // Copiar mesero de la mesa origen a la mesa destino (si existe)
                  if (selectedTable) {
                    const waiterIdSrc = tableWaiter[selectedTable.id]
                    if (waiterIdSrc) {
                      setTableWaiter(prev => (
                        prev[transferTargetId] === waiterIdSrc
                          ? prev
                          : { ...prev, [transferTargetId]: waiterIdSrc }
                      ))
                    }
                  }
                  setCurrentOrder([])
                  setShowTransferDialog(false)
                  toast({ title: "Todos los productos transferidos", description: `A mesa ${transferTargetId}` })
                  logAudit("order-transfer-all", `Mesa ${selectedTable.number} → Mesa ${transferTargetId} · ${toMove.length} líneas`)
                }}
              >
                Transferir todo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Supervisor PIN Dialog */}
        <Dialog open={showSupervisorDialog} onOpenChange={setShowSupervisorDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Autorización de Supervisor</DialogTitle>
              <DialogDescription>{supervisorActionLabel}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>PIN de Supervisor</Label>
              <Input
                type="password"
                value={supervisorPinInput}
                onChange={(e) => setSupervisorPinInput(e.target.value)}
              />
              {supervisorError && <div className="text-xs text-destructive">{supervisorError}</div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSupervisorDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (supervisorPinInput === supervisorPIN) {
                    setShowSupervisorDialog(false)
                    const cb = pendingSupervisorAction
                    setPendingSupervisorAction(null)
                    setSupervisorPinInput("")
                    setSupervisorError("")
                    logAudit("supervisor-override", supervisorActionLabel)
                    cb && cb()
                  } else {
                    setSupervisorError("PIN incorrecto")
                  }
                }}
              >
                Autorizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCashClose} onOpenChange={setShowCashClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cerrar Caja</DialogTitle>
              <DialogDescription>Arqueo de caja: compare efectivo físico vs sistema</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Efectivo en sistema:</span>
                <span className="font-medium">${currentCash.toFixed(2)}</span>
              </div>
              <Label>Efectivo físico</Label>
              <Input type="number" step="0.01" value={physicalCount} onChange={(e) => setPhysicalCount(Number(e.target.value))} />
              <div className="flex justify-between text-sm">
                <span>Diferencia:</span>
                <span className="font-medium">${(physicalCount - currentCash).toFixed(2)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCashClose(false)}>Cancelar</Button>
              <Button onClick={closeCash}>Confirmar Cierre</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCashMove} onOpenChange={setShowCashMove}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Movimiento de efectivo</DialogTitle>
              <DialogDescription>Registre entradas o retiros durante el turno</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button variant={cashMoveType === "entrada" ? "default" : "outline"} onClick={() => setCashMoveType("entrada")}>Entrada</Button>
                <Button variant={cashMoveType === "retiro" ? "default" : "outline"} onClick={() => setCashMoveType("retiro")}>Retiro</Button>
              </div>
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input type="number" step="0.01" value={cashMoveAmount} onChange={(e) => setCashMoveAmount(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Motivo / Justificación</Label>
                <Input value={cashMoveReason} onChange={(e) => setCashMoveReason(e.target.value)} placeholder="Ej: cambio, pago proveedor, etc." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCashMove(false)}>Cancelar</Button>
              <Button onClick={registerCashMove} disabled={cashMoveAmount <= 0 || !cashMoveReason.trim()}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Waiter Dialog (also in tables mode so it can open) */}
        <Dialog open={showAssignWaiter} onOpenChange={setShowAssignWaiter}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Mesero</DialogTitle>
              <DialogDescription>
                {pendingAreaTable ? `Mesa ${pendingAreaTable.label} · ${pendingAreaTable.seats} personas` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Mesero</Label>
              <Select value={selectedWaiterId} onValueChange={setSelectedWaiterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione mesero" />
                </SelectTrigger>
                <SelectContent>
                  {waiters.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignWaiter(false)}>Cancelar</Button>
              <Button onClick={confirmAssignWaiter} disabled={!selectedWaiterId}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Supervisor PIN Dialog */}
        <Dialog open={showSupervisorDialog} onOpenChange={setShowSupervisorDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Autorización de Supervisor</DialogTitle>
              <DialogDescription>{supervisorActionLabel}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>PIN de Supervisor</Label>
              <Input
                type="password"
                value={supervisorPinInput}
                onChange={(e) => setSupervisorPinInput(e.target.value)}
              />
              {supervisorError && <div className="text-xs text-destructive">{supervisorError}</div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSupervisorDialog(false)}>Cancelar</Button>
              <Button
                onClick={() => {
                  if (supervisorPinInput === supervisorPIN) {
                    setShowSupervisorDialog(false)
                    const cb = pendingSupervisorAction
                    setPendingSupervisorAction(null)
                    setSupervisorPinInput("")
                    setSupervisorError("")
                    logAudit("supervisor-override", supervisorActionLabel)
                    cb && cb()
                  } else {
                    setSupervisorError("PIN incorrecto")
                  }
                }}
              >
                Autorizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reports Dialog */}
        <Dialog open={showReportsDialog} onOpenChange={setShowReportsDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Reportes del Turno</DialogTitle>
              <DialogDescription>
                Inicio: {currentShift.startTime.toLocaleString()} · Cajero: {currentShift.userName}
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="sales" className="py-2">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="sales">Ventas</TabsTrigger>
                <TabsTrigger value="products">Productos</TabsTrigger>
                <TabsTrigger value="payments">Pagos</TabsTrigger>
                <TabsTrigger value="reprint">Reimprimir</TabsTrigger>
                <TabsTrigger value="audits">Auditoría</TabsTrigger>
              </TabsList>

              <TabsContent value="sales" className="space-y-3 mt-3">
                <div className="grid grid-cols-3 gap-3">
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Total del Día</div>
                      <div className="text-xl font-bold text-primary">${currentShift.totalSales.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Órdenes</div>
                      <div className="text-xl font-bold">{currentShift.totalOrders}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Ticket Promedio</div>
                      <div className="text-xl font-bold">
                        ${currentShift.totalOrders > 0 ? (currentShift.totalSales / currentShift.totalOrders).toFixed(2) : "0.00"}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Efectivo en caja</div>
                      <div className="text-lg font-bold text-green-500">${currentCash.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-border">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Por método de cobro</div>
                      <div className="space-y-0.5 text-xs font-medium">
                        <div className="flex justify-between"><span>Efectivo</span><span className="text-green-500">${currentShift.paymentMethods.cash.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Tarjeta</span><span className="text-blue-500">${currentShift.paymentMethods.card.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Transferencia</span><span className="text-purple-500">${currentShift.paymentMethods.transfer.toFixed(2)}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="products" className="mt-3">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Productos vendidos en el turno</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      {Object.keys(currentShift.productsUsed).length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 text-sm">Sin ventas registradas aún</div>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(currentShift.productsUsed)
                            .sort(([, a], [, b]) => b - a)
                            .map(([product, quantity]) => {
                              const revenue = payments.reduce((sum, p) => {
                                return sum + p.items.filter((i) => i.name === product).reduce((s, i) => s + i.price * i.quantity, 0)
                              }, 0)
                              return (
                                <div key={product} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                                  <div>
                                    <div className="text-sm font-medium">{product}</div>
                                    <div className="text-xs text-muted-foreground">{quantity} unid.</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-primary text-sm">${revenue.toFixed(2)}</div>
                                    <div className="text-[10px] text-muted-foreground">en ventas</div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="space-y-3 mt-3">
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { label: "Efectivo", key: "cash" as const, color: "text-green-500", bar: "bg-green-500" },
                      { label: "Tarjeta", key: "card" as const, color: "text-blue-500", bar: "bg-blue-500" },
                      { label: "Transferencia", key: "transfer" as const, color: "text-purple-500", bar: "bg-purple-500" },
                    ] as const
                  ).map(({ label, key, color, bar }) => {
                    const amount = currentShift.paymentMethods[key]
                    const pct = currentShift.totalSales > 0 ? (amount / currentShift.totalSales) * 100 : 0
                    return (
                      <Card key={key} className="border-border">
                        <CardContent className="p-4 text-center">
                          <div className="text-xs text-muted-foreground mb-1">{label}</div>
                          <div className={`text-xl font-bold ${color}`}>${amount.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}%</div>
                          <div className="mt-2 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="reprint" className="mt-3">
                {payments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No hay tickets en este turno</p>
                  </div>
                ) : (
                  <ScrollArea className="h-72">
                    <div className="space-y-2 pr-1">
                      {payments.slice().reverse().map((p) => (
                        <Card key={p.id} className="border-border">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">Mesa {p.tableNumber} · {p.orderId}</div>
                                <div className="text-xs text-muted-foreground">{p.timestamp.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">
                                  {p.tenders.map((t) => t.method === "cash" ? "Efectivo" : t.method === "card" ? `Tarjeta${t.cardBatch ? ` (Lote ${t.cardBatch})` : ""}` : `Depósito${t.transferRef ? ` (${t.transferRef})` : ""}`).join(" + ")}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="font-bold text-primary">${p.amount.toFixed(2)}</div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-transparent h-7 text-xs"
                                  onClick={() => {
                                    setPrintTicket({
                                      kind: "payment",
                                      ticketId: p.orderId,
                                      timestamp: p.timestamp,
                                      tableNumber: p.tableNumber,
                                      waiterName: p.waiterName || "-",
                                      serviceType: "mesa",
                                      diners: 1,
                                      items: p.items,
                                      discountAmount: 0,
                                      tenders: p.tenders,
                                      paidBy: p.userName,
                                    })
                                    setShowReportsDialog(false)
                                    setTimeout(() => {
                                      if (typeof window !== "undefined") {
                                        window.print()
                                        logAudit("reprint", p.id)
                                      }
                                    }, 150)
                                  }}
                                >
                                  Reimprimir
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="audits" className="mt-3">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Registro de Auditoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      {auditLog.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">Sin eventos</div>
                      ) : (
                        <div className="space-y-2 text-sm">
                          {auditLog.slice().reverse().map((a) => (
                            <div key={a.id} className="flex items-start justify-between border-b border-border pb-2 last:border-0">
                              <div className="flex-1 pr-4">
                                <div className="font-medium">{a.action}</div>
                                {a.description && <div className="text-muted-foreground text-xs">{a.description}</div>}
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <div>{a.userName} · {a.role}</div>
                                <div>{a.timestamp.toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button onClick={() => setShowReportsDialog(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {PrintTicketView}
      </>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-background no-print">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  // ensure dialogs don't remain open after leaving the table
                  goToTables()
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Punto de Venta</h1>
                <p className="text-sm text-muted-foreground">Gestión de mesas y pedidos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowReportsDialog(true)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Reportes
              </Button>
              {selectedTable && (
                <div className="hidden md:flex items-center gap-2">
                  <Label className="text-xs">Cuenta</Label>
                  <Select
                    value={selectedAccountId || ""}
                    onValueChange={(val) => {
                      if (!selectedTable) return
                      const tableId = selectedTable.id
                      const list = accountsByTable[tableId] || []
                      const acc = list.find((a) => a.id === val)
                      if (!acc) return
                      closeAllDialogs()
                      isHydratingAccountRef.current = true
                      setSelectedAccountId(acc.id)
                      setOrderId(acc.orderId)
                      setOrderStartTime(new Date(acc.startTime))
                      setDiners(acc.diners)
                      setServiceType(acc.serviceType)
                      setOrderStatus(acc.status)
                      setDiscountAmount(acc.discountAmount)
                      setOrderDeducted(acc.deducted)
                      setCurrentOrder(acc.items)
                      queueMicrotask(() => {
                        isHydratingAccountRef.current = false
                      })
                    }}
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue placeholder="Seleccione cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {(accountsByTable[selectedTable.id] || []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent"
                    disabled={(accountsByTable[selectedTable.id] || []).length >= MAX_ACCOUNTS_PER_TABLE}
                    onClick={() => {
                      if (!selectedTable) return
                      const tableId = selectedTable.id
                      const list = accountsByTable[tableId] || []
                      if (list.length >= MAX_ACCOUNTS_PER_TABLE) {
                        toast({ title: "Límite alcanzado", description: `Máximo ${MAX_ACCOUNTS_PER_TABLE} cuentas por mesa.` })
                        return
                      }
                      const nextAcc = createAccount(tableId, selectedTable.capacity || diners, list.length + 1)
                      setAccountsByTable((prev) => ({ ...prev, [tableId]: [...(prev[tableId] || []), nextAcc] }))
                      closeAllDialogs()
                      isHydratingAccountRef.current = true
                      setSelectedAccountId(nextAcc.id)
                      setOrderId(nextAcc.orderId)
                      setOrderStartTime(new Date(nextAcc.startTime))
                      setDiners(nextAcc.diners)
                      setServiceType(nextAcc.serviceType)
                      setOrderStatus(nextAcc.status)
                      setDiscountAmount(0)
                      setOrderDeducted(false)
                      setCurrentOrder([])
                      queueMicrotask(() => {
                        isHydratingAccountRef.current = false
                      })
                      toast({ title: "Nueva cuenta", description: `${nextAcc.label} creada` })
                      logAudit("account-new", `Mesa ${selectedTable.number} · ${nextAcc.label}`)
                    }}
                  >
                    + Cuenta
                  </Button>

                  <Separator orientation="vertical" className="h-6" />

                  <Label className="text-xs">Mesero</Label>
                  <Select
                    value={tableWaiter[selectedTable.id] || ""}
                    onValueChange={(val) => setTableWaiter((prev) => ({ ...prev, [selectedTable.id]: val }))}
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue placeholder="Seleccione mesero" />
                    </SelectTrigger>
                    <SelectContent>
                      {waiters.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "pos" | "billing")} className="mb-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pos">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Punto de Venta
            </TabsTrigger>
            <TabsTrigger value="billing">
              <FileText className="w-4 h-4 mr-2" />
              Facturación
            </TabsTrigger>
          </TabsList>

          {/* POS View */}
          <TabsContent value="pos">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Menu Section */}
              <div className="lg:col-span-1">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Menú</CardTitle>
                    <CardDescription>
                      {selectedTable ? `Mesa ${selectedTable.number}` : ""}
                    </CardDescription>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar productos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        disabled={!selectedTable}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-4">
                      <TabsList className="grid grid-cols-3 lg:grid-cols-5 w-full">
                        {categories.map((cat) => (
                          <TabsTrigger key={cat} value={cat} className="text-xs" disabled={!selectedTable}>
                            {cat}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>

                    <ScrollArea className="h-[calc(100vh-420px)]">
                      <div className="space-y-2">
                        {filteredMenu.map((item) => (
                          <Card
                            key={item.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              !selectedTable ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            onClick={() => selectedTable && handleAddItem(item)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">{item.category}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-primary">${item.price.toFixed(2)}</div>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={!selectedTable}>
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Order Section */}
              <div className="lg:col-span-1">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Pedido Actual
                    </CardTitle>
                    <CardDescription>
                      {selectedTable ? `Mesa ${selectedTable.number}` : "Sin mesa seleccionada"}
                    </CardDescription>
                    {selectedTable && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Label className="w-28">Ticket</Label>
                          <div className="font-medium">{orderId}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="w-28">Inicio</Label>
                          <div>{(orderStartTime || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="w-28">Comensales</Label>
                          <Input type="number" className="h-8 w-24" value={diners}
                                 onChange={(e) => setDiners(Math.max(1, Number(e.target.value)))}/>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="w-28">Servicio</Label>
                          <Select value={serviceType} onValueChange={(v) => setServiceType(v as any)}>
                            <SelectTrigger className="h-8 w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mesa">En mesa</SelectItem>
                              <SelectItem value="para_llevar">Para llevar</SelectItem>
                              <SelectItem value="domicilio">Domicilio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="w-28">Estado</Label>
                          <Badge variant="outline">{orderStatus === 'pendiente' ? 'Pendiente' : orderStatus === 'en_cocina' ? 'En cocina' : orderStatus === 'servido' ? 'Servido' : 'Pagado'}</Badge>
                        </div>
                        <div className="hidden md:flex items-center gap-2">
                          <Label className="w-28">Mesero</Label>
                          <Select
                            value={tableWaiter[selectedTable.id] || ""}
                            onValueChange={(val) => setTableWaiter((prev) => ({ ...prev, [selectedTable.id]: val }))}
                          >
                            <SelectTrigger className="h-8 w-full">
                              <SelectValue placeholder="Seleccione mesero" />
                            </SelectTrigger>
                            <SelectContent>
                              {waiters.map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                  {w.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[calc(100vh-420px)] mb-4">
                      {currentOrder.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                          <p>No hay items en el pedido</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {currentOrder.map((item) => (
                            <Card key={item.id} className="border-border">
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm flex items-center gap-2">
                                      {item.name}
                                      {item.status && (
                                        <Badge variant="outline" className="text-[10px]">
                                          {item.status === 'en_cocina' ? 'En cocina' : item.status === 'listo' ? 'Listo' : 'Entregado'}
                                        </Badge>
                                      )}
                                    </div>
                                    {item.modifiers && item.modifiers.length > 0 && (
                                      <div className="text-[11px] text-muted-foreground">
                                        {item.modifiers.map((m, idx) => (
                                          <span key={idx}>{m.group}: {m.option}{m.priceDelta ? ` (+$${m.priceDelta})` : ""}{idx < item.modifiers!.length - 1 ? ", " : ""}</span>
                                        ))}
                                      </div>
                                    )}
                                    {item.notes && (
                                      <div className="text-[11px] italic text-muted-foreground">Obs: {item.notes}</div>
                                    )}
                                    <div className="text-xs text-muted-foreground">${item.price.toFixed(2)} c/u</div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-destructive"
                                    onClick={() => handleRemoveItem(item.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0 bg-transparent"
                                      onClick={() => handleUpdateQuantity(item.id, -1)}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0 bg-transparent"
                                      onClick={() => handleUpdateQuantity(item.id, 1)}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-primary">
                                      ${((item.price + getModifiersPrice(item.modifiers)) * item.quantity).toFixed(2)}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground text-right">Subtotal</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </ScrollArea>

                    <Separator className="my-4" />

                    <div className="space-y-3">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Subtotal:</span>
                          <span>${calculateSubtotal().toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Descuento:</span>
                          <span>-${discountAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Impuestos (16%):</span>
                          <span>${calculateTax().toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Propina sugerida (10%):</span>
                          <span>${(calculateSubtotal() * 0.10).toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span className="text-primary">${calculateTotal().toFixed(2)}</span>
                        </div>
                        <div>
                          <Button variant="outline" size="sm" className="mt-2 bg-transparent" onClick={() => setShowDiscountDialog(true)}>
                            Aplicar descuento
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          className="w-full bg-transparent"
                          disabled={currentOrder.length === 0}
                          onClick={handleSendToKitchen}
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Enviar a Cocina
                        </Button>
                        <Button className="w-full" disabled={currentOrder.length === 0} onClick={handlePayment}>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Cobrar
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full bg-transparent"
                          disabled={!selectedTable}
                          onClick={() => {
                            setTransferQtyByIndex({})
                            setTransferTargetId(null)
                            setShowTransferDialog(true)
                          }}
                        >
                          Transferir a otra mesa
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="w-full bg-transparent"
                          disabled={currentOrder.length === 0}
                          onClick={() => {
                            setPrintTicket({
                              kind: "precount",
                              ticketId: orderId || "-",
                              timestamp: orderStartTime || new Date(),
                              tableNumber: selectedTable?.number,
                              waiterName: selectedTable ? (waiters.find(w => w.id === (tableWaiter[selectedTable.id] || ""))?.name || "-") : "-",
                              serviceType: serviceType,
                              diners: diners,
                              items: currentOrder,
                              discountAmount: discountAmount,
                              tenders: [],
                            })
                            setTimeout(() => {
                              if (typeof window !== 'undefined') {
                                window.print()
                                toast({ title: "Imprimiendo cuenta", description: orderId || '' })
                                logAudit("order-print", orderId || '')
                              }
                            }, 100)
                          }}
                        >
                          Imprimir comanda
                        </Button>
                        <Button
                          variant="destructive"
                          className="w-full"
                          disabled={currentOrder.length === 0}
                          onClick={() => requireSupervisor("Autorizar cancelación de pedido", () => {
                            setCurrentOrder([])
                            setOrderId(null)
                            setOrderStartTime(null)
                            setDiscountAmount(0)
                            setOrderStatus("pendiente")
                            toast({ title: "Pedido cancelado" })
                            logAudit("order-cancel", selectedTable ? `Mesa ${selectedTable.number}` : undefined)
                          })}
                        >
                          Cancelar pedido
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full bg-transparent"
                          disabled={!selectedTable}
                          onClick={() => openSplitDialog()}
                        >
                          Dividir cuenta
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Invoices */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Cuentas Pendientes de Factura</CardTitle>
                  <CardDescription>Pagos realizados sin factura</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {payments.filter((p) => !p.invoiced).length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No hay cuentas pendientes</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {payments
                          .filter((p) => !p.invoiced)
                          .map((payment) => (
                            <Card key={payment.id} className="border-border">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="font-medium">Mesa {payment.tableNumber}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {payment.timestamp.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Método:{" "}
                                      {payment.tenders
                                        .map((t) => (t.method === "cash" ? "Efectivo" : t.method === "card" ? "Tarjeta" : "Depósito"))
                                        .join(" + ")}
                                    </div>
                                    {payment.tenders.length > 0 ? (
                                      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                                        {payment.tenders.map((t) => (
                                          <div key={t.id} className="flex items-center justify-between gap-2">
                                            <span className="truncate">
                                              {t.method === "cash" ? "Efectivo" : t.method === "card" ? `Tarjeta${t.cardBatch ? ` (Lote ${t.cardBatch})` : ""}` : `Depósito${t.transferRef ? ` (No. ${t.transferRef})` : ""}`}
                                            </span>
                                            <span className="tabular-nums">${t.amount.toFixed(2)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-primary">${payment.amount.toFixed(2)}</div>
                                    <Badge variant="outline" className="mt-1">
                                      Pendiente
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="w-full mt-2"
                                  onClick={() => {
                                    setCurrentPayment(payment)
                                    setShowInvoiceDialog(true)
                                  }}
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  Generar Factura
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Completed Invoices */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Facturas Realizadas</CardTitle>
                  <CardDescription>Historial de facturas del turno</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {invoices.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No hay facturas generadas</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {invoices.map((invoice) => (
                          <Card key={invoice.id} className="border-border">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="font-medium">{invoice.id}</div>
                                  <div className="text-xs text-muted-foreground">Mesa {invoice.tableNumber}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {invoice.timestamp.toLocaleString()}
                                  </div>
                                  {invoice.customerName && (
                                    <div className="text-xs text-muted-foreground">Cliente: {invoice.customerName}</div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-primary">${invoice.total.toFixed(2)}</div>
                                  <Badge variant="outline" className="mt-1 bg-green-500/10 text-green-500">
                                    Facturada
                                  </Badge>
                                </div>
                              </div>
                              <Separator className="my-2" />
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span>${invoice.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>IVA (16%):</span>
                                  <span>${invoice.tax.toFixed(2)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
            <DialogDescription>Mesa {selectedTable?.number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {currentOrder.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total a Pagar:</span>
              <span className="text-primary">${calculateTotal().toFixed(2)}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Pagos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPaymentTendersDraft((prev) => [
                      ...prev,
                      { id: `td-${Date.now()}-${prev.length}`, method: "cash", amount: 0 },
                    ])
                  }
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar método
                </Button>
              </div>

              <div className="space-y-2">
                {paymentTendersDraft.map((tender, idx) => {
                  const totalDue = Number(calculateTotal().toFixed(2))
                  const sum = Number(paymentTendersDraft.reduce((s, x) => s + (Number(x.amount) || 0), 0).toFixed(2))
                  const remaining = Number((totalDue - sum).toFixed(2))
                  return (
                    <div key={tender.id} className="rounded-md border p-3 space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 sm:col-span-5">
                          <Label className="text-xs">Método</Label>
                          <Select
                            value={tender.method}
                            onValueChange={(v) =>
                              setPaymentTendersDraft((prev) =>
                                prev.map((x) =>
                                  x.id === tender.id
                                    ? {
                                        ...x,
                                        method: v as any,
                                        cardBatch: v === "card" ? x.cardBatch : undefined,
                                        transferRef: v === "transfer" ? x.transferRef : undefined,
                                      }
                                    : x,
                                ),
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Método" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Efectivo</SelectItem>
                              <SelectItem value="card">Tarjeta</SelectItem>
                              <SelectItem value="transfer">Depósito/Transferencia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-12 sm:col-span-4">
                          <Label className="text-xs">Monto</Label>
                          <Input
                            inputMode="decimal"
                            type="number"
                            step="0.01"
                            value={Number.isFinite(tender.amount) ? tender.amount : 0}
                            onChange={(e) =>
                              setPaymentTendersDraft((prev) =>
                                prev.map((x) => (x.id === tender.id ? { ...x, amount: Number(e.target.value) } : x)),
                              )
                            }
                          />
                        </div>

                        <div className="col-span-12 sm:col-span-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="w-full"
                            disabled={paymentTendersDraft.length === 1}
                            onClick={() => setPaymentTendersDraft((prev) => prev.filter((x) => x.id !== tender.id))}
                            title="Quitar método"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {tender.method === "card" ? (
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-12 sm:col-span-6">
                            <Label className="text-xs">Lote</Label>
                            <Input
                              value={tender.cardBatch || ""}
                              onChange={(e) =>
                                setPaymentTendersDraft((prev) =>
                                  prev.map((x) => (x.id === tender.id ? { ...x, cardBatch: e.target.value } : x)),
                                )
                              }
                              placeholder="Ej: 123"
                            />
                          </div>
                        </div>
                      ) : null}

                      {tender.method === "transfer" ? (
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-12 sm:col-span-8">
                            <Label className="text-xs">No. depósito / referencia</Label>
                            <Input
                              value={tender.transferRef || ""}
                              onChange={(e) =>
                                setPaymentTendersDraft((prev) =>
                                  prev.map((x) => (x.id === tender.id ? { ...x, transferRef: e.target.value } : x)),
                                )
                              }
                              placeholder="Ej: 00012345"
                            />
                          </div>
                        </div>
                      ) : null}

                      {idx === paymentTendersDraft.length - 1 ? (
                        <div className="text-xs text-muted-foreground flex justify-between">
                          <span>Pagado: ${sum.toFixed(2)}</span>
                          <span className={remaining === 0 ? "text-green-600" : remaining < 0 ? "text-destructive" : ""}>
                            Restante: ${remaining.toFixed(2)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCompletePayment}>Confirmar Pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modifiers Dialog */}
      <Dialog open={showModifiersDialog} onOpenChange={setShowModifiersDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modificadores</DialogTitle>
            <DialogDescription>{pendingItem?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {pendingItem && modifierGroupsByCategory[pendingItem.category]?.map((group) => (
              <div key={group.id} className="space-y-2">
                <Label className="text-sm">{group.name}</Label>
                {group.type === "single" ? (
                  <RadioGroup
                    value={(pendingModifiers[group.id] as string) || ""}
                    onValueChange={(v) => setPendingModifiers((prev) => ({ ...prev, [group.id]: v }))}
                    className="grid grid-cols-2 gap-2"
                  >
                    {group.options.map((opt) => (
                      <div key={opt.id} className="flex items-center space-x-2 rounded-md border p-2">
                        <RadioGroupItem id={`${group.id}-${opt.id}`} value={opt.id} />
                        <Label htmlFor={`${group.id}-${opt.id}`} className="flex-1 cursor-pointer">
                          {opt.name}
                          {opt.priceDelta ? <span className="text-xs text-muted-foreground"> (+${opt.priceDelta})</span> : null}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {group.options.map((opt) => {
                      const arr = (pendingModifiers[group.id] as string[]) || []
                      const checked = arr.includes(opt.id)
                      return (
                        <label key={opt.id} className="flex items-center space-x-2 rounded-md border p-2 cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setPendingModifiers((prev) => {
                                const prevArr = (prev[group.id] as string[]) || []
                                const nextArr = v ? [...prevArr, opt.id] : prevArr.filter((x) => x !== opt.id)
                                return { ...prev, [group.id]: nextArr }
                              })
                            }}
                          />
                          <span className="flex-1">
                            {opt.name} {opt.priceDelta ? <span className="text-xs text-muted-foreground">(+${opt.priceDelta})</span> : null}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            {/* Observaciones */}
            <div className="space-y-2">
              <Label className="text-sm">Observaciones</Label>
              <Textarea
                placeholder="Ej: Sin cebolla, separar salsas, etc."
                value={pendingNotes}
                onChange={(e) => setPendingNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModifiersDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!pendingItem) return
                // Build modifiers array
                const groups = modifierGroupsByCategory[pendingItem.category] || []
                const mods: Array<{ group: string; option: string; priceDelta: number }> = []
                groups.forEach((g) => {
                  if (g.type === "single") {
                    const sel = pendingModifiers[g.id] as string
                    if (sel) {
                      const opt = g.options.find((o) => o.id === sel)
                      if (opt) mods.push({ group: g.name, option: opt.name, priceDelta: opt.priceDelta || 0 })
                    }
                  } else {
                    const sels = (pendingModifiers[g.id] as string[]) || []
                    sels.forEach((sid) => {
                      const opt = g.options.find((o) => o.id === sid)
                      if (opt) mods.push({ group: g.name, option: opt.name, priceDelta: opt.priceDelta || 0 })
                    })
                  }
                })

                const newItem: OrderItem = { ...pendingItem, quantity: 1, modifiers: mods, notes: pendingNotes || undefined }
                setCurrentOrder((prev) => [...prev, newItem])
                setShowModifiersDialog(false)
              }}
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* (Asignar Mesero Dialog ya está renderizado en la vista de mesas) */}

      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Factura</DialogTitle>
            <DialogDescription>Pago procesado - Mesa {currentPayment?.tableNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="customerName">Nombre del Cliente (Opcional)</Label>
                <Input id="customerName" placeholder="Nombre completo" />
              </div>
              <div>
                <Label htmlFor="customerRFC">RFC (Opcional)</Label>
                <Input id="customerRFC" placeholder="RFC del cliente" />
              </div>
            </div>
            <Separator />
              <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${getInvoiceBreakdownFromTotal(currentPayment?.amount || 0).subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (16%):</span>
                <span>${getInvoiceBreakdownFromTotal(currentPayment?.amount || 0).tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">${getInvoiceBreakdownFromTotal(currentPayment?.amount || 0).total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleSkipInvoice} className="w-full sm:w-auto bg-transparent">
              Omitir Factura
            </Button>
            <Button
              onClick={() => {
                const customerName = (document.getElementById("customerName") as HTMLInputElement)?.value
                const customerRFC = (document.getElementById("customerRFC") as HTMLInputElement)?.value
                handleGenerateInvoice(customerName, customerRFC)
              }}
              className="w-full sm:w-auto"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generar Factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cerrar Turno</DialogTitle>
            <DialogDescription>Resumen del turno de {currentShift.userName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Ventas</div>
                  <div className="text-2xl font-bold text-primary">${currentShift.totalSales.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Órdenes</div>
                  <div className="text-2xl font-bold">{currentShift.totalOrders}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Ventas por Método de Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Efectivo:</span>
                  <span className="font-medium">${currentShift.paymentMethods.cash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tarjeta:</span>
                  <span className="font-medium">${currentShift.paymentMethods.card.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Transferencia:</span>
                  <span className="font-medium">${currentShift.paymentMethods.transfer.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Productos Utilizados</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {Object.entries(currentShift.productsUsed).map(([product, quantity]) => (
                      <div key={product} className="flex justify-between text-sm">
                        <span>{product}</span>
                        <span className="font-medium">{quantity} unidades</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="text-xs text-muted-foreground">
              <div>Inicio: {currentShift.startTime.toLocaleString()}</div>
              {currentShift.endTime && <div>Fin: {currentShift.endTime.toLocaleString()}</div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShiftDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setShowShiftDialog(false)
                logoutPOS()
              }}
            >
              Confirmar y Cerrar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

  <Dialog open={showReportsDialog} onOpenChange={setShowReportsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Reportes del Turno</DialogTitle>
            <DialogDescription>
              Inicio: {currentShift.startTime.toLocaleString()} · Cajero: {currentShift.userName}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="sales" className="py-2">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="sales">Ventas</TabsTrigger>
              <TabsTrigger value="products">Productos</TabsTrigger>
              <TabsTrigger value="payments">Pagos</TabsTrigger>
              <TabsTrigger value="reprint">Reimprimir</TabsTrigger>
              <TabsTrigger value="audits">Auditoría</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-3 mt-3">
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Total del Día</div>
                    <div className="text-xl font-bold text-primary">${currentShift.totalSales.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Órdenes</div>
                    <div className="text-xl font-bold">{currentShift.totalOrders}</div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Ticket Promedio</div>
                    <div className="text-xl font-bold">
                      $
                      {currentShift.totalOrders > 0
                        ? (currentShift.totalSales / currentShift.totalOrders).toFixed(2)
                        : "0.00"}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Efectivo en caja</div>
                    <div className="text-lg font-bold text-green-500">${currentCash.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1">Por método de cobro</div>
                    <div className="space-y-0.5 text-xs font-medium">
                      <div className="flex justify-between"><span>Efectivo</span><span className="text-green-500">${currentShift.paymentMethods.cash.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Tarjeta</span><span className="text-blue-500">${currentShift.paymentMethods.card.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Transferencia</span><span className="text-purple-500">${currentShift.paymentMethods.transfer.toFixed(2)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products" className="mt-3">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Productos vendidos en el turno</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {Object.keys(currentShift.productsUsed).length === 0 ? (
                      <div className="text-center text-muted-foreground py-8 text-sm">Sin ventas registradas aún</div>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(currentShift.productsUsed)
                          .sort(([, a], [, b]) => b - a)
                          .map(([product, quantity]) => {
                            const revenue = payments.reduce((sum, p) => {
                              return sum + p.items
                                .filter((i) => i.name === product)
                                .reduce((s, i) => s + i.price * i.quantity, 0)
                            }, 0)
                            return (
                              <div key={product} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                                <div>
                                  <div className="text-sm font-medium">{product}</div>
                                  <div className="text-xs text-muted-foreground">{quantity} unid.</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-primary text-sm">${revenue.toFixed(2)}</div>
                                  <div className="text-[10px] text-muted-foreground">en ventas</div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-3 mt-3">
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { label: "Efectivo", key: "cash" as const, color: "text-green-500", bar: "bg-green-500" },
                    { label: "Tarjeta", key: "card" as const, color: "text-blue-500", bar: "bg-blue-500" },
                    { label: "Transferencia", key: "transfer" as const, color: "text-purple-500", bar: "bg-purple-500" },
                  ] as const
                ).map(({ label, key, color, bar }) => {
                  const amount = currentShift.paymentMethods[key]
                  const pct = currentShift.totalSales > 0 ? (amount / currentShift.totalSales) * 100 : 0
                  return (
                    <Card key={key} className="border-border">
                      <CardContent className="p-4 text-center">
                        <div className="text-xs text-muted-foreground mb-1">{label}</div>
                        <div className={`text-xl font-bold ${color}`}>${amount.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}%</div>
                        <div className="mt-2 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Detalle de pagos del turno</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-40">
                    {payments.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-4">Sin pagos registrados</div>
                    ) : (
                      <div className="space-y-1 text-sm">
                        {payments
                          .slice()
                          .reverse()
                          .map((p) => (
                            <div key={p.id} className="flex justify-between border-b border-border pb-1.5 last:border-0">
                              <div>
                                <span className="font-medium">Mesa {p.tableNumber}</span>
                                <span className="text-muted-foreground text-xs ml-2">
                                  {p.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {p.tenders.map((t) => (t.method === "cash" ? "Ef" : t.method === "card" ? "Tj" : "Tr")).join("+")}
                                </span>
                                <span className="font-bold">${p.amount.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reprint" className="mt-3">
              {payments.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No hay tickets en este turno</p>
                </div>
              ) : (
                <ScrollArea className="h-72">
                  <div className="space-y-2 pr-1">
                    {payments
                      .slice()
                      .reverse()
                      .map((p) => (
                        <Card key={p.id} className="border-border">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">
                                  Mesa {p.tableNumber} · {p.orderId}
                                </div>
                                <div className="text-xs text-muted-foreground">{p.timestamp.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">
                                  {p.tenders
                                    .map((t) =>
                                      t.method === "cash"
                                        ? "Efectivo"
                                        : t.method === "card"
                                          ? `Tarjeta${t.cardBatch ? ` (Lote ${t.cardBatch})` : ""}`
                                          : `Depósito${t.transferRef ? ` (${t.transferRef})` : ""}`,
                                    )
                                    .join(" + ")}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="font-bold text-primary">${p.amount.toFixed(2)}</div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-transparent h-7 text-xs"
                                  onClick={() => {
                                    setPrintTicket({
                                      kind: "payment",
                                      ticketId: p.orderId,
                                      timestamp: p.timestamp,
                                      tableNumber: p.tableNumber,
                                      waiterName: p.waiterName || "-",
                                      serviceType: "mesa",
                                      diners: 1,
                                      items: p.items,
                                      discountAmount: 0,
                                      tenders: p.tenders,
                                      paidBy: p.userName,
                                    })
                                    setShowReportsDialog(false)
                                    setTimeout(() => {
                                      if (typeof window !== "undefined") {
                                        window.print()
                                        logAudit("reprint", p.id)
                                      }
                                    }, 150)
                                  }}
                                >
                                  Reimprimir
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="audits" className="mt-3">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Registro de Auditoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {auditLog.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-4">Sin eventos</div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        {auditLog
                          .slice()
                          .reverse()
                          .map((a) => (
                            <div key={a.id} className="flex items-start justify-between border-b border-border pb-2 last:border-0">
                              <div className="flex-1 pr-4">
                                <div className="font-medium">{a.action}</div>
                                {a.description && (
                                  <div className="text-muted-foreground text-xs">{a.description}</div>
                                )}
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <div>
                                  {a.userName} · {a.role}
                                </div>
                                <div>{a.timestamp.toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button onClick={() => setShowReportsDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    {PrintTicketView}
    </>
  )
}

