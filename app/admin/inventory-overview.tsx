"use client"

/**
 * Vista consolidada de inventario para el admin: todos los insumos de todas
 * las sucursales, con filtro por establecimiento. Solo lectura.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Package, AlertTriangle } from "lucide-react"
import { insumos as insumosApi, establecimientos as establecimientosApi, type Insumo, type Establecimiento } from "@/lib/api"

const fmtQ = (n: number) => `Q${n.toFixed(2)}`

export function InventoryOverview() {
  const [sucursales, setSucursales] = useState<Establecimiento[]>([])
  const [filtro, setFiltro] = useState<string>("all")
  const [items, setItems] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    establecimientosApi.getTodos("admin").then(setSucursales).catch(() => {})
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

  const resumen = useMemo(() => {
    const total = items.length
    const bajoStock = items.filter((i) => i.stockActual <= i.stockMinimo).length
    const valor = items.reduce((s, i) => s + i.stockActual * i.costoUnitario, 0)
    return { total, bajoStock, valor }
  }, [items])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-bold">Inventario consolidado</h2>
          <p className="text-xs text-muted-foreground">Vista general de todas las sucursales</p>
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
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Package className="w-4 h-4" />Insumos</div>
          <div className="text-2xl font-bold mt-1">{resumen.total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="w-4 h-4" />Bajo stock</div>
          <div className={`text-2xl font-bold mt-1 ${resumen.bajoStock > 0 ? "text-amber-500" : ""}`}>{resumen.bajoStock}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Valor en inventario</div>
          <div className="text-2xl font-bold mt-1">{fmtQ(resumen.valor)}</div>
        </CardContent></Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Insumo</th>
                  <th className="p-3 font-medium">Sucursal</th>
                  <th className="p-3 font-medium">Unidad</th>
                  <th className="p-3 font-medium text-right">Stock</th>
                  <th className="p-3 font-medium text-right">Mínimo</th>
                  <th className="p-3 font-medium text-right">Costo unit.</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const low = i.stockActual <= i.stockMinimo
                  return (
                    <tr key={i.id} className="border-b border-border/50 last:border-0">
                      <td className="p-3 font-medium">{i.nombre}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="font-normal">{i.establecimientoNombre ?? "—"}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{i.unidad}</td>
                      <td className={`p-3 text-right font-medium ${low ? "text-amber-500" : ""}`}>
                        {i.stockActual}{low && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">{i.stockMinimo}</td>
                      <td className="p-3 text-right">{fmtQ(i.costoUnitario)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                {loading ? "Cargando…" : "Sin insumos"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
