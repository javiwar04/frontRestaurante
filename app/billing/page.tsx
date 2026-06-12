"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getSession, clearSession, type AuthUser,
  pagos, facturas, type Pago, type Factura,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft, LogOut, Receipt, FileText, Plus, XCircle, CheckCircle, Search, RefreshCw,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

const fmt = (n: number) => `Q${n.toFixed(2)}`
const fmtDate = (s: string) =>
  new Date(s).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
const metodosLabel: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" }

export default function BillingPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [activeTab, setActiveTab] = useState("pagos")

  useEffect(() => {
    const session = getSession("billing")
    if (!session) { router.push("/billing/login"); return }
    setUser(session.user)
  }, [router])

  const logout = () => { clearSession("billing"); router.push("/billing/login") }

  // ── State ──────────────────────────────────────────────────────────────────
  const [pagosList, setPagosList] = useState<Pago[]>([])
  const [facturasList, setFacturasList] = useState<Factura[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  const loadData = () => {
    setLoading(true)
    Promise.all([
      pagos.getAll("billing").then(setPagosList).catch(() => {}),
      facturas.getAll({}, "billing").then(r => setFacturasList(r.datos)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { if (user) loadData() }, [user])

  // ── Create factura dialog ──────────────────────────────────────────────────
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null)
  const [showFacturaDialog, setShowFacturaDialog] = useState(false)
  const [facturaForm, setFacturaForm] = useState({ clienteNombre: "", clienteRfc: "" })
  const [saving, setSaving] = useState(false)

  const openFacturaDialog = (p: Pago) => {
    setSelectedPago(p)
    setFacturaForm({ clienteNombre: "", clienteRfc: "" })
    setShowFacturaDialog(true)
  }

  const submitFactura = () => {
    if (!selectedPago) return
    if (!facturaForm.clienteNombre.trim()) { toast({ title: "El nombre del cliente es requerido" }); return }
    setSaving(true)
    facturas.create({
      pagoId: selectedPago.id,
      clienteNombre: facturaForm.clienteNombre.trim(),
      clienteRfc: facturaForm.clienteRfc.trim() || undefined,
    }).then(f => {
      setFacturasList(prev => [f, ...prev])
      setPagosList(prev => prev.map(p => p.id === selectedPago.id ? { ...p, facturado: true } : p))
      toast({ title: "Factura creada", description: `Folio: ${f.folio}` })
      setShowFacturaDialog(false)
    }).catch(e => toast({ title: "Error al crear factura", description: String(e), variant: "destructive" }))
      .finally(() => setSaving(false))
  }

  // ── Cancel factura dialog ──────────────────────────────────────────────────
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelMotivo, setCancelMotivo] = useState("")

  const openCancelDialog = (f: Factura) => { setSelectedFactura(f); setCancelMotivo(""); setShowCancelDialog(true) }

  const submitCancel = () => {
    if (!selectedFactura) return
    if (!cancelMotivo.trim()) { toast({ title: "Ingresa el motivo de cancelación" }); return }
    setSaving(true)
    facturas.cancelar(selectedFactura.id, cancelMotivo).then(updated => {
      setFacturasList(prev => prev.map(f => f.id === updated.id ? updated : f))
      toast({ title: "Factura cancelada", description: selectedFactura.folio })
      setShowCancelDialog(false)
    }).catch(e => toast({ title: "Error al cancelar", description: String(e), variant: "destructive" }))
      .finally(() => setSaving(false))
  }

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filteredPagos = useMemo(() => {
    if (!search) return pagosList
    const q = search.toLowerCase()
    return pagosList.filter(p => p.id.toLowerCase().includes(q) || p.ordenId?.toLowerCase().includes(q))
  }, [pagosList, search])

  const filteredFacturas = useMemo(() => {
    if (!search) return facturasList
    const q = search.toLowerCase()
    return facturasList.filter(f => f.folio.toLowerCase().includes(q) || (f.clienteNombre ?? "").toLowerCase().includes(q))
  }, [facturasList, search])

  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} title="Volver al panel">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Facturación</h1>
              <p className="text-xs text-muted-foreground">{user.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={loadData} disabled={loading} title="Recargar">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1" />Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Buscar por ID, folio, cliente…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pagos"><Receipt className="w-4 h-4 mr-1" />Pagos ({pagosList.length})</TabsTrigger>
            <TabsTrigger value="facturas"><FileText className="w-4 h-4 mr-1" />Facturas ({facturasList.length})</TabsTrigger>
          </TabsList>

          {/* ══ PAGOS ══ */}
          <TabsContent value="pagos" className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {pagosList.filter(p => !p.facturado).length} pendientes de facturar ·{" "}
                {pagosList.filter(p => p.facturado).length} facturados
              </p>
            </div>

            {filteredPagos.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No hay pagos registrados</p>
              </div>
            )}

            {filteredPagos.map(p => (
              <Card key={p.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{p.id.slice(0, 8)}…</code>
                        {p.facturado
                          ? <Badge variant="secondary" className="text-xs gap-1"><CheckCircle className="w-3 h-3" />Facturado</Badge>
                          : <Badge variant="outline" className="text-xs">Sin factura</Badge>
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">{fmtDate(p.registradoEn)}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.tenders.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {metodosLabel[t.metodo] ?? t.metodo}: {fmt(t.monto)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-2">
                      <div className="text-lg font-bold text-primary">{fmt(p.montoTotal)}</div>
                      {!p.facturado && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => openFacturaDialog(p)}>
                          <Plus className="w-3 h-3 mr-1" />Facturar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ══ FACTURAS ══ */}
          <TabsContent value="facturas" className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {facturasList.filter(f => !f.cancelada).length} vigentes ·{" "}
                {facturasList.filter(f => f.cancelada).length} canceladas
              </p>
            </div>

            {filteredFacturas.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No hay facturas emitidas</p>
              </div>
            )}

            {filteredFacturas.map(f => (
              <Card key={f.id} className={`border-border ${f.cancelada ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{f.folio}</span>
                        {f.cancelada
                          ? <Badge variant="destructive" className="text-xs gap-1"><XCircle className="w-3 h-3" />Cancelada</Badge>
                          : <Badge variant="default" className="text-xs gap-1"><CheckCircle className="w-3 h-3" />Vigente</Badge>
                        }
                      </div>
                      <div className="text-sm">{f.clienteNombre ?? "Cliente general"}</div>
                      {f.clienteRfc && <div className="text-xs text-muted-foreground">RFC: {f.clienteRfc}</div>}
                      <div className="text-xs text-muted-foreground">{fmtDate(f.fechaEmision)}</div>
                    </div>
                    <div className="text-right shrink-0 space-y-2">
                      <div className="text-lg font-bold">{fmt(f.total)}</div>
                      <div className="text-xs text-muted-foreground">IVA: {fmt(f.impuestos)}</div>
                      {!f.cancelada && (
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => openCancelDialog(f)}>
                          <XCircle className="w-3 h-3 mr-1" />Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Create Factura Dialog ── */}
      <Dialog open={showFacturaDialog} onOpenChange={setShowFacturaDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear factura</DialogTitle>
            <DialogDescription>
              Pago {selectedPago?.id.slice(0, 8)}… · Total: {selectedPago ? fmt(selectedPago.montoTotal) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre del cliente <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Nombre o razón social"
                value={facturaForm.clienteNombre}
                onChange={e => setFacturaForm(p => ({ ...p, clienteNombre: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>RFC (opcional)</Label>
              <Input
                placeholder="XAXX010101000"
                value={facturaForm.clienteRfc}
                onChange={e => setFacturaForm(p => ({ ...p, clienteRfc: e.target.value.toUpperCase() }))}
                maxLength={13}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFacturaDialog(false)}>Cancelar</Button>
            <Button onClick={submitFactura} disabled={saving}>
              {saving ? "Generando…" : "Generar factura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Factura Dialog ── */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar factura</DialogTitle>
            <DialogDescription>Folio: {selectedFactura?.folio}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Motivo de cancelación <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Ingrese el motivo…"
              value={cancelMotivo}
              onChange={e => setCancelMotivo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Cerrar</Button>
            <Button variant="destructive" onClick={submitCancel} disabled={saving}>
              {saving ? "Cancelando…" : "Confirmar cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
