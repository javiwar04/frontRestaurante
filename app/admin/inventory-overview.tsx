"use client"

/**
 * Inventario consolidado del admin: permite crear/actualizar insumos en una o
 * varias sucursales, y agrupa el listado para ver el stock por local sin ruido.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { AlertTriangle, Eye, Package, Plus, RefreshCw } from "lucide-react"
import { insumos as insumosApi, establecimientos as establecimientosApi, type Establecimiento, type Insumo } from "@/lib/api"

const fmtQ = (n: number) => `Q${n.toFixed(2)}`
const norm = (s: string) => s.trim().toLowerCase()
const groupKey = (i: Pick<Insumo, "nombre" | "unidad">) => `${norm(i.nombre)}|${norm(i.unidad)}`

const unitOptions = ["kg", "g", "L", "mL", "pza", "caja", "bolsa", "lata", "vaso", "bote", "paquete"]

type InventoryGroup = {
  key: string
  nombre: string
  unidad: string
  rows: Insumo[]
  totalStock: number
  minStock: number
  valor: number
  lowCount: number
}

type FormState = {
  nombre: string
  unidad: string
  stockActual: string
  stockMinimo: string
  costoUnitario: string
  sucursalIds: string[]
}

const blankForm = (): FormState => ({
  nombre: "",
  unidad: "pza",
  stockActual: "0",
  stockMinimo: "0",
  costoUnitario: "0",
  sucursalIds: [],
})

export function InventoryOverview({ onChanged }: { onChanged?: () => void }) {
  const [sucursales, setSucursales] = useState<Establecimiento[]>([])
  const [filtro, setFiltro] = useState<string>("all")
  const [items, setItems] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(blankForm())
  const [selectedGroup, setSelectedGroup] = useState<InventoryGroup | null>(null)

  useEffect(() => {
    establecimientosApi.getTodos("admin").then((list) => {
      setSucursales(list)
      setForm((prev) => ({ ...prev, sucursalIds: list.map((s) => s.id) }))
    }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await insumosApi.getAll("admin", filtro === "all" ? undefined : filtro)
      setItems(list)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => { load() }, [load])

  const groups = useMemo<InventoryGroup[]>(() => {
    const map = new Map<string, InventoryGroup>()
    items.forEach((i) => {
      const key = groupKey(i)
      const prev = map.get(key) ?? {
        key,
        nombre: i.nombre,
        unidad: i.unidad,
        rows: [],
        totalStock: 0,
        minStock: 0,
        valor: 0,
        lowCount: 0,
      }
      const low = i.stockActual <= i.stockMinimo
      prev.rows.push(i)
      prev.totalStock += i.stockActual
      prev.minStock += i.stockMinimo
      prev.valor += i.stockActual * i.costoUnitario
      prev.lowCount += low ? 1 : 0
      map.set(key, prev)
    })
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [items])

  const resumen = useMemo(() => {
    const total = groups.length
    const bajoStock = groups.filter((g) => g.lowCount > 0).length
    const valor = groups.reduce((s, g) => s + g.valor, 0)
    return { total, bajoStock, valor }
  }, [groups])

  const toggleSucursal = (id: string) => {
    setForm((prev) => ({
      ...prev,
      sucursalIds: prev.sucursalIds.includes(id)
        ? prev.sucursalIds.filter((x) => x !== id)
        : [...prev.sucursalIds, id],
    }))
  }

  const openNew = () => {
    setForm({ ...blankForm(), sucursalIds: filtro === "all" ? sucursales.map((s) => s.id) : [filtro] })
    setShowForm(true)
  }

  const save = async () => {
    const nombre = form.nombre.trim()
    const unidad = form.unidad.trim() || "pza"
    const sucursalIds = form.sucursalIds
    if (!nombre) { toast({ title: "El nombre es requerido" }); return }
    if (sucursalIds.length === 0) { toast({ title: "Selecciona al menos una sucursal" }); return }

    setSaving(true)
    try {
      const all = await insumosApi.getAll("admin")
      const stockActual = Number(form.stockActual) || 0
      const stockMinimo = Number(form.stockMinimo) || 0
      const costoUnitario = Number(form.costoUnitario) || 0

      await Promise.all(sucursalIds.map((establecimientoId) => {
        const existing = all.find((i) =>
          i.establecimientoId === establecimientoId &&
          norm(i.nombre) === norm(nombre) &&
          norm(i.unidad) === norm(unidad)
        )
        const payload = { nombre, unidad, stockActual, stockMinimo, costoUnitario }
        return existing
          ? insumosApi.update(existing.id, { ...payload, activo: true }, "admin")
          : insumosApi.create(payload, "admin", establecimientoId)
      }))

      toast({ title: "Insumo guardado", description: `Aplicado en ${sucursalIds.length} sucursal(es).` })
      setShowForm(false)
      await load()
      onChanged?.()
    } catch (e) {
      toast({ title: "No se pudo guardar", description: String((e as { message?: string })?.message ?? e), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-bold">Inventario consolidado</h2>
          <p className="text-xs text-muted-foreground">Crea insumos por sucursal y revisa stock consolidado</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {sucursales.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="bg-transparent" onClick={() => load()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" />Insumo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Package className="w-4 h-4" />Insumos</div>
          <div className="text-2xl font-bold mt-1">{resumen.total}</div>
          <div className="text-xs text-muted-foreground">{items.length} registros por sucursal</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="w-4 h-4" />Con alerta</div>
          <div className={`text-2xl font-bold mt-1 ${resumen.bajoStock > 0 ? "text-amber-500" : ""}`}>{resumen.bajoStock}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Valor en inventario</div>
          <div className="text-2xl font-bold mt-1">{fmtQ(resumen.valor)}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Insumo</th>
                  <th className="p-3 font-medium">Sucursales</th>
                  <th className="p-3 font-medium">Unidad</th>
                  <th className="p-3 font-medium text-right">Stock total</th>
                  <th className="p-3 font-medium text-right">Minimo total</th>
                  <th className="p-3 font-medium text-right">Valor</th>
                  <th className="p-3 font-medium text-right">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const low = g.lowCount > 0
                  return (
                    <tr key={g.key} className="border-b border-border/50 last:border-0">
                      <td className="p-3 font-medium">{g.nombre}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {g.rows.map((i) => (
                            <Badge key={i.id} variant="outline" className="font-normal">{i.establecimientoNombre ?? "Sin sucursal"}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{g.unidad}</td>
                      <td className={`p-3 text-right font-medium ${low ? "text-amber-500" : ""}`}>
                        {g.totalStock}{low && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">{g.minStock}</td>
                      <td className="p-3 text-right">{fmtQ(g.valor)}</td>
                      <td className="p-3 text-right">
                        <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={() => setSelectedGroup(g)}>
                          <Eye className="w-3.5 h-3.5 mr-1" />Ver
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {groups.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                {loading ? "Cargando..." : "Sin insumos"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar insumo</DialogTitle>
            <DialogDescription>Se creara o actualizara el mismo insumo en las sucursales seleccionadas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Banano, Chocolate..." />
              </div>
              <div className="space-y-1">
                <Label>Unidad</Label>
                <Input list="admin-inventory-units" value={form.unidad} onChange={(e) => setForm((p) => ({ ...p, unidad: e.target.value }))} />
                <datalist id="admin-inventory-units">
                  {unitOptions.map((u) => <option key={u} value={u} />)}
                </datalist>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Stock inicial</Label>
                <Input type="number" step="0.01" value={form.stockActual} onChange={(e) => setForm((p) => ({ ...p, stockActual: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Stock minimo</Label>
                <Input type="number" step="0.01" value={form.stockMinimo} onChange={(e) => setForm((p) => ({ ...p, stockMinimo: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Costo unitario</Label>
                <Input type="number" step="0.01" value={form.costoUnitario} onChange={(e) => setForm((p) => ({ ...p, costoUnitario: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sucursales donde aplica</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setForm((p) => ({ ...p, sucursalIds: sucursales.map((s) => s.id) }))}>Todas</Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {sucursales.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                    <Checkbox checked={form.sucursalIds.includes(s.id)} onCheckedChange={() => toggleSucursal(s.id)} />
                    <span>{s.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedGroup} onOpenChange={(open) => { if (!open) setSelectedGroup(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedGroup?.nombre}</DialogTitle>
            <DialogDescription>Detalle de stock por sucursal</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {selectedGroup?.rows.map((i) => {
              const low = i.stockActual <= i.stockMinimo
              return (
                <div key={i.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">{i.establecimientoNombre ?? "Sin sucursal"}</div>
                    <div className="text-xs text-muted-foreground">Unidad: {i.unidad}</div>
                  </div>
                  <div className={`text-right font-semibold ${low ? "text-amber-500" : ""}`}>{i.stockActual}</div>
                  <div className="text-right text-muted-foreground">Min {i.stockMinimo}</div>
                  <div className="text-right">{fmtQ(i.costoUnitario)}</div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
