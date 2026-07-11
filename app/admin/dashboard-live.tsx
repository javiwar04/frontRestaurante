"use client"

/**
 * Dashboard en vivo del día: KPIs (ventas, órdenes, ticket promedio),
 * desglose por método, ventas por hora y top platillos.
 * Se alimenta de los pagos del backend y se refresca al instante cuando
 * llega un evento "pagada" por SignalR.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, Receipt, DollarSign, Trophy, Radio } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { pagos, reportes, type Pago, type ReportePlatillos } from "@/lib/api"
import { connectRealtime } from "@/lib/realtime"

const fmtQ = (n: number) => `Q${n.toFixed(2)}`
const METHOD_LABEL: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" }
const normMethod = (m: string) =>
  m === "efectivo" ? "cash" : m === "tarjeta" ? "card" : m === "transferencia" ? "transfer" : m

function todayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return { startMs: start.getTime(), endMs: end.getTime(), iso: start.toISOString().slice(0, 10) }
}

export function DashboardLive({ module = "admin" }: { module?: string }) {
  const [todayPagos, setTodayPagos] = useState<Pago[]>([])
  const [topPlatillos, setTopPlatillos] = useState<ReportePlatillos["platillos"]>([])
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    const { startMs, endMs } = todayRange()
    try {
      const [allPagos, plats] = await Promise.all([
        pagos.getAll(module).catch(() => [] as Pago[]),
        // Sin fechas: el backend usa "hoy" en hora Guatemala (rango correcto)
        reportes.platillos(undefined, undefined, module).catch(() => null),
      ])
      const hoy = allPagos.filter((p) => {
        const t = new Date(p.registradoEn).getTime()
        return t >= startMs && t <= endMs
      })
      setTodayPagos(hoy)
      setTopPlatillos(plats?.platillos?.slice(0, 8) ?? [])
      setUpdatedAt(new Date())
    } finally {
      setLoading(false)
    }
  }, [module])

  useEffect(() => { load() }, [load])

  // Tiempo real: refrescar cuando se registra/cambia un pago
  const loadRef = useRef(load)
  useEffect(() => { loadRef.current = load }, [load])
  useEffect(() => {
    const conn = connectRealtime((e) => {
      if (e.evento === "pagada" || e.evento === "cancelada") loadRef.current()
    })
    const checkLive = setInterval(() => {
      setLive((conn as any)?.state === "Connected")
    }, 2000)
    return () => { clearInterval(checkLive); conn.stop().catch(() => {}) }
  }, [])

  const kpis = useMemo(() => {
    const totalVentas = todayPagos.reduce((s, p) => s + p.montoTotal, 0)
    const totalOrdenes = todayPagos.length
    const ticket = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0
    const porMetodo: Record<string, number> = { cash: 0, card: 0, transfer: 0 }
    todayPagos.forEach((p) => (p.tenders || []).forEach((t) => {
      const m = normMethod(t.metodo)
      porMetodo[m] = (porMetodo[m] ?? 0) + t.monto
    }))
    return { totalVentas, totalOrdenes, ticket, porMetodo }
  }, [todayPagos])

  const porHora = useMemo(() => {
    if (todayPagos.length === 0) return [] as { hora: string; total: number }[]
    const buckets = new Array(24).fill(0) as number[]
    todayPagos.forEach((p) => { buckets[new Date(p.registradoEn).getHours()] += p.montoTotal })
    const horasConVenta = buckets.map((v, h) => ({ v, h })).filter((x) => x.v > 0).map((x) => x.h)
    const min = Math.min(...horasConVenta)
    const max = Math.max(...horasConVenta)
    const out: { hora: string; total: number }[] = []
    for (let h = min; h <= max; h++) out.push({ hora: `${h}:00`, total: Number(buckets[h].toFixed(2)) })
    return out
  }, [todayPagos])

  const maxPlatillo = Math.max(1, ...topPlatillos.map((p) => p.cantidadVendida))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Resumen de hoy</h2>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${live ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
            <Radio className="w-3 h-3" />{live ? "En vivo" : "Sin conexión"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && <span className="text-xs text-muted-foreground">Actualizado {updatedAt.toLocaleTimeString()}</span>}
          <Button variant="outline" size="sm" className="bg-transparent" onClick={() => load()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Ventas del día</div>
            <div className="text-2xl font-bold mt-1 truncate">{fmtQ(kpis.totalVentas)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-chart-1/15 text-chart-1"><DollarSign className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Órdenes</div>
            <div className="text-2xl font-bold mt-1">{kpis.totalOrdenes}</div>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-chart-2/15 text-chart-2"><Receipt className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Ticket promedio</div>
            <div className="text-2xl font-bold mt-1 truncate">{fmtQ(kpis.ticket)}</div>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-chart-3/15 text-chart-3"><TrendingUp className="w-5 h-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Por método</div>
          <div className="space-y-0.5 text-sm">
            {(["cash", "card", "transfer"] as const).map((m) => (
              <div key={m} className="flex justify-between">
                <span className="text-muted-foreground">{METHOD_LABEL[m]}</span>
                <span className="font-medium">{fmtQ(kpis.porMetodo[m] ?? 0)}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ventas por hora */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Ventas por hora</CardTitle></CardHeader>
          <CardContent>
            {porHora.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                {loading ? "Cargando…" : "Sin ventas hoy"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={porHora}>
                  <XAxis dataKey="hora" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                    formatter={(v: number) => [fmtQ(v), "Ventas"]}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top platillos */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4" />Top platillos de hoy</CardTitle></CardHeader>
          <CardContent>
            {topPlatillos.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                {loading ? "Cargando…" : "Sin datos"}
              </div>
            ) : (
              <div className="space-y-2">
                {topPlatillos.map((p, i) => (
                  <div key={p.platilloId || i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate"><span className="text-muted-foreground mr-1">{i + 1}.</span>{p.nombre}</span>
                      <span className="font-medium shrink-0 ml-2">{p.cantidadVendida} · {fmtQ(p.totalGenerado)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(p.cantidadVendida / maxPlatillo) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
