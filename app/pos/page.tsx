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
    const sector = sectors.find((s) => s.id === selectedSectorId) ?? sectors[0]
    return (
      <>
        <div className="min-h-screen bg-background no-print">
          <header className="border-b border-border bg-card sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => router.push("/")}
                    >
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
                        <DropdownMenuItem
                          onClick={() => {
                            if (currentUser.role === "mesero") {
                              toast({
                                title: "Permiso denegado",
                                description: "Solo cajero o supervisor pueden abrir caja.",
                              })
                              return
                            }
                            setShowCashOpen(true)
                          }}
                        >
                          Abrir Caja
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              if (currentUser.role === "mesero") {
                                toast({
                                  title: "Permiso denegado",
                                  description: "Solo cajero o supervisor pueden mover caja.",
                                })
                                return
                              }
                              setShowCashMove(true)
                            }}
                          >
                            Movimiento de efectivo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (currentUser.role === "mesero") {
                                toast({
                                  title: "Permiso denegado",
                                  description: "Solo cajero o supervisor pueden cerrar caja.",
                                })
                                return
                              }
                              setShowCashClose(true)
                            }}
                          >
                            Cerrar Caja
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button size="sm" onClick={handleCloseShift}>
                    <Clock className="w-4 h-4 mr-2" />
                    Cerrar Turno
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Opciones
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Gestión de Turno</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowReportsDialog(true)}>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Ver Reportes
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-muted-foreground" onClick={logoutPOS}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Cerrar Sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
            </Tabs>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {sector.tables.map((t) => {
                const waiterName =
                  waiters.find((w) => w.id === (tableWaiter[t.id] || ""))?.name || "—"
                return (
                  <Card
                    key={t.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelectAreaTable({ id: t.id, label: t.label, seats: t.seats })}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-lg font-bold">{t.label}</div>
                          <div className="text-xs text-muted-foreground">{t.seats} personas</div>
                        </div>
                        <Badge variant="outline" className={getTableStatusColor(t.status)}>
                          {safelyGetStatusText(t.status)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">Mesero: {waiterName}</div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </main>

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
                <Input
                  type="number"
                  step="0.01"
                  value={physicalCount}
                  onChange={(e) => setPhysicalCount(Number(e.target.value))}
                />
                <div className="flex justify-between text-sm">
                  <span>Diferencia:</span>
                  <span className="font-medium">${(physicalCount - currentCash).toFixed(2)}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCashClose(false)}>
                  Cancelar
                </Button>
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
                  <Button
                    variant={cashMoveType === "entrada" ? "default" : "outline"}
                    onClick={() => setCashMoveType("entrada")}
                  >
                    Entrada
                  </Button>
                  <Button
                    variant={cashMoveType === "retiro" ? "default" : "outline"}
                    onClick={() => setCashMoveType("retiro")}
                  >
                    Retiro
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cashMoveAmount}
                    onChange={(e) => setCashMoveAmount(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Motivo / Justificación</Label>
                  <Input
                    value={cashMoveReason}
                    onChange={(e) => setCashMoveReason(e.target.value)}
                    placeholder="Ej: cambio, pago proveedor, etc."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCashMove(false)}>
                  Cancelar
                </Button>
                <Button onClick={registerCashMove} disabled={cashMoveAmount <= 0 || !cashMoveReason.trim()}>
                  Registrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                <Button variant="outline" onClick={() => setShowAssignWaiter(false)}>
                  Cancelar
                </Button>
                <Button onClick={confirmAssignWaiter} disabled={!selectedWaiterId}>
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
        </div>

        {PrintTicketView}
      </>
    )
  }
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

  const getSubtotalFromItems = (items: OrderItem[]) => {
    return items.reduce((sum, item) => {
      const unit = item.price + getModifiersPrice(item.modifiers)
      return sum + unit * item.quantity
    }, 0)
  }

  const getTaxFromSnapshot = (items: OrderItem[], snapshotDiscountAmount: number) => {
    const subtotal = getSubtotalFromItems(items)
    const taxable = Math.max(0, subtotal - snapshotDiscountAmount)
    return taxable * TAX_RATE
  }

  const getTotalFromSnapshot = (items: OrderItem[], snapshotDiscountAmount: number) => {
    const subtotal = getSubtotalFromItems(items)
    const taxable = Math.max(0, subtotal - snapshotDiscountAmount)
    return taxable + taxable * TAX_RATE
  }

  const printPaymentReceipt = (payment: Payment) => {
    setPrintTicket({
      kind: "payment",
      ticketId: payment.orderId,
      timestamp: payment.timestamp,
      tableNumber: payment.tableNumber,
      waiterName: payment.waiterName || "-",
      serviceType: payment.serviceType,
      diners: payment.diners,
      items: payment.items.map((i) => ({ ...i })),
      discountAmount: payment.discountAmount,
      tenders: payment.tenders,
      paidBy: payment.userName,
    })

    setTimeout(() => {
      try {
        window.print()
      } catch {
        // ignore
      }
    }, 50)
  }

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

      const missingCardBatch = tenders.find((t) => t.method === "card" && !t.cardBatch)
      if (missingCardBatch) {
        toast({ title: "Falta lote", description: "Ingrese el lote para el pago con tarjeta." })
        return
      }

      const missingTransferRef = tenders.find((t) => t.method === "transfer" && !t.transferRef)
      if (missingTransferRef) {
        toast({ title: "Falta referencia", description: "Ingrese el No. de depósito/referencia." })
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
        diners,
        serviceType,
        discountAmount,
        waiterId: assignedWaiterId,
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

      // Imprimir recibo de pago (tipo comanda) con métodos
      printPaymentReceipt(payment)
      // Volver automáticamente a la vista de áreas/mesas
      goToTables()
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

  const PrintTicketView = (
    <div className="print-only print-ticket mx-auto text-xs text-black">
      <div className="p-3">
        <div className="text-center">
          {/* Coloca tu logo en /public/logo.png si lo deseas */}
          {/* <img src="/logo.png" alt="Logo" className="mx-auto mb-1 w-14 h-14 object-contain" /> */}
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
                    <span className="font-semibold">
                      {item.quantity} x {item.name}
                    </span>
                    <span>${line.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-black/70">
                    <span>Precio c/u: ${unit.toFixed(2)}</span>
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="pl-2 text-[10px]">
                      {item.modifiers.map((m, i) => (
                        <div key={i}>
                          - {m.group}: {m.option}
                        </div>
                      ))}
                    </div>
                  )}
                  {item.notes && <div className="pl-2 italic text-[10px]">Obs: {item.notes}</div>}
                </div>
              )
            })
          )}
        </div>

        <div className="my-2 border-t border-dashed border-black" />
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${(printTicket ? getSubtotalFromItems(printTicket.items) : calculateSubtotal()).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Descuento</span>
            <span>- ${(printTicket ? printTicket.discountAmount : discountAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA (16%)</span>
            <span>
              ${
                (printTicket
                  ? getTaxFromSnapshot(printTicket.items, printTicket.discountAmount)
                  : calculateTax()
                ).toFixed(2)
              }
            </span>
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>
              ${
                (printTicket
                  ? getTotalFromSnapshot(printTicket.items, printTicket.discountAmount)
                  : calculateTotal()
                ).toFixed(2)
              }
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

  // Important: never return early before all hooks are declared.
  if (!sessionReady) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>
  }

  // Tables-by-area landing view
  if (mode === "tables") {
    const sector = sectors.find((s) => s.id === selectedSectorId)!
    return (
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Opciones
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Gestión de Turno</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowReportsDialog(true)}>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Ver Reportes
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-muted-foreground" onClick={logoutPOS}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Cerrar Sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                                      <DropdownMenuItem
                                        onClick={() => {
                                          if (currentUser.role === "mesero") {
                                            toast({
                                              title: "Permiso denegado",
                                              description: "Solo cajero o supervisor pueden abrir caja.",
                                            })
                                            return
                                          }
                                          setShowCashOpen(true)
                                        }}
                                      >
                                        Abrir Caja
                                      </DropdownMenuItem>
                                    ) : (
                                      <>
                                        <DropdownMenuItem onClick={() => setShowCashMove(true)}>Movimiento de Caja</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setShowCashClose(true)}>Cerrar Caja</DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button variant="outline" size="sm" onClick={() => setShowShiftDialog(true)}>
                                  <BarChart3 className="w-4 h-4 mr-2" />
                                  Turno
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setShowReportsDialog(true)}>
                                  <BarChart3 className="w-4 h-4 mr-2" />
                                  Reportes
                                </Button>
                                <Button variant="outline" size="sm" onClick={logoutPOS}>
                                  <LogOut className="w-4 h-4 mr-2" />
                                  Salir
                                </Button>
                              </div>
                            </div>
                          </div>
                        </header>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dividir cuenta</DialogTitle>
              <DialogDescription>Cálculo simple por número de personas</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Personas</Label>
                <Input type="number" min={2} value={splitPeople} onChange={(e) => setSplitPeople(Math.max(2, Number(e.target.value)))} />
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span>Total</span>
                <span className="font-medium">${calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Cada uno</span>
                <span className="text-primary">${(calculateTotal() / Math.max(1, splitPeople)).toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground">Nota: Esta es una sugerencia de reparto. Los pagos parciales se implementarán en una versión posterior.</div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowSplitDialog(false)}>Cerrar</Button>
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

        {/* (Supervisor PIN Dialog ya está renderizado arriba) */}
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
                          disabled={currentOrder.length === 0}
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
                            if (typeof window !== 'undefined') {
                              window.print()
                              toast({ title: "Imprimiendo cuenta", description: orderId || '' })
                              logAudit("order-print", orderId || '')
                            }
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
                          disabled={currentOrder.length === 0}
                          onClick={() => setShowSplitDialog(true)}
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
            <DialogDescription>Análisis detallado de ventas y operaciones</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="sales" className="py-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sales">Ventas</TabsTrigger>
              <TabsTrigger value="products">Productos</TabsTrigger>
              <TabsTrigger value="payments">Métodos de Pago</TabsTrigger>
              <TabsTrigger value="audits">Auditoría</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
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

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Ventas por Usuario</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span>{currentShift.userName}</span>
                    <span className="font-bold">${currentShift.totalSales.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Productos Más Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {Object.entries(currentShift.productsUsed)
                        .sort(([, a], [, b]) => b - a)
                        .map(([product, quantity]) => (
                          <div key={product} className="flex justify-between items-center">
                            <span className="text-sm">{product}</span>
                            <Badge variant="outline">{quantity} unidades</Badge>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Distribución por Método de Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Efectivo</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${(currentShift.paymentMethods.cash / currentShift.totalSales) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium w-20 text-right">
                          ${currentShift.paymentMethods.cash.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Tarjeta</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${(currentShift.paymentMethods.card / currentShift.totalSales) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium w-20 text-right">
                          ${currentShift.paymentMethods.card.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Transferencia</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500"
                            style={{
                              width: `${(currentShift.paymentMethods.transfer / currentShift.totalSales) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="font-medium w-20 text-right">
                          ${currentShift.paymentMethods.transfer.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audits" className="space-y-4">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Registro de Auditoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {auditLog.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Sin eventos</div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        {auditLog
                          .slice()
                          .reverse()
                          .map((a) => (
                            <div key={a.id} className="flex items-start justify-between border-b pb-2">
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

    {/* PRINT: Customer ticket (80mm) */}
    <div className="print-only print-ticket mx-auto text-xs text-black">
      <div className="p-3">
        <div className="text-center">
          {/* Coloca tu logo en /public/logo.png si lo deseas */}
          {/* <img src="/logo.png" alt="Logo" className="mx-auto mb-1 w-14 h-14 object-contain" /> */}
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
            <span>${(printTicket ? getSubtotalFromItems(printTicket.items) : calculateSubtotal()).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Descuento</span>
            <span>- ${(printTicket ? printTicket.discountAmount : discountAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA (16%)</span>
            <span>
              ${
                (printTicket
                  ? getTaxFromSnapshot(printTicket.items, printTicket.discountAmount)
                  : calculateTax()
                ).toFixed(2)
              }
            </span>
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>
              ${
                (printTicket
                  ? getTotalFromSnapshot(printTicket.items, printTicket.discountAmount)
                  : calculateTotal()
                ).toFixed(2)
              }
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
    </>
  )
}

