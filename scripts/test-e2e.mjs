// Suite e2e del backend del restaurante. Ejercita el flujo completo y
// verifica los arreglos de las fases 1-3: rondas (addItem), propina +
// descuento, pago, factura (flag facturado), auditoría, categoría en KDS y
// los eventos de tiempo real (incluyendo numeroMesa en "lista").
//
// Uso:  node scripts/test-e2e.mjs       (hace login admin/0000 por su cuenta)
//       TOKEN=... node scripts/test-e2e.mjs   (usa un token existente)
import signalR from "@microsoft/signalr"

const API = "http://localhost:5006"
const eventos = []
let pass = 0, fail = 0

function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${extra}`) }
}
const near = (a, b, eps = 0.02) => Math.abs(a - b) < eps

// ── Auth ──────────────────────────────────────────────────────────────────
let token = process.env.TOKEN
if (!token) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", pin: "0000" }),
  })
  if (!r.ok) { console.error("Login falló:", r.status); process.exit(1) }
  token = (await r.json()).token
}
const auth = (m, b) => ({ method: m, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: b ? JSON.stringify(b) : undefined })
const anon = (m, b) => ({ method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined })

// ── Hub ─────────────────────────────────────────────────────────────────────
const conn = new signalR.HubConnectionBuilder().withUrl(`${API}/hubs/restaurante`).configureLogging(signalR.LogLevel.Error).build()
conn.on("ordenes:cambio", (e) => { eventos.push(e) })
await conn.start()
check("SignalR conecta", conn.state === "Connected")

// ── Contexto ──────────────────────────────────────────────────────────────
let turnoRes = await fetch(`${API}/turnos/activo`, auth("GET"))
let turno = turnoRes.ok ? await turnoRes.json() : null
if (!turno) {
  turno = await (await fetch(`${API}/turnos`, auth("POST", { efectivoInicial: 100 }))).json()
  console.log(`  (abrí turno de prueba ${turno.id.slice(0, 8)})`)
}
const secs = await (await fetch(`${API}/secciones`, auth("GET"))).json()
const plats = await (await fetch(`${API}/platillos`, auth("GET"))).json()
const mesa = secs.flatMap((s) => s.mesas)[2] ?? secs.flatMap((s) => s.mesas)[0]
const p1 = plats[0], p2 = plats[1]
const IVA = 0.12

// ── 1. Crear orden (ronda 1) ────────────────────────────────────────────────
let orden = await (await fetch(`${API}/ordenes`, auth("POST", {
  mesaId: mesa.id, turnoId: turno.id, tipoServicio: "mesa",
  items: [{ platilloId: p1.id, nombre: p1.nombre, cantidad: 1, precioUnitario: p1.precio }],
}))).json()
check("Orden nace 'pendiente' (cocina la ve como nueva)", orden.estado === "pendiente", `(estado=${orden.estado})`)

// ── 2. Ronda 2: addItem sobre la MISMA orden ─────────────────────────────────
orden = await (await fetch(`${API}/ordenes/${orden.id}/items`, auth("POST", {
  platilloId: p2.id, nombre: p2.nombre, cantidad: 2, precioUnitario: p2.precio,
}))).json()
check("Ronda 2 agrega a la misma orden (no crea otra)", orden.items.length === 2)
const subtotal = p1.precio * 1 + p2.precio * 2
check("Subtotal recalculado en backend", near(orden.subtotal, subtotal), `(${orden.subtotal} vs ${subtotal})`)

// ── 3. Descuento + propina vía update ────────────────────────────────────────
const descuento = 10, propina = 15
orden = await (await fetch(`${API}/ordenes/${orden.id}`, auth("PUT", {
  descuento, propina, notas: null, comensales: 3,
}))).json()
const baseEsperado = Math.max(0, subtotal - descuento)
const totalEsperado = baseEsperado + baseEsperado * IVA + propina
check("Total incluye descuento + IVA + propina", near(orden.total, totalEsperado), `(${orden.total} vs ${totalEsperado})`)
check("Propina persistida", near(orden.propina, propina))

// ── 4. KDS: la orden trae categoría por ítem ─────────────────────────────────
const cocinaList = await (await fetch(`${API}/cocina/ordenes`)).json()
const enCocina = cocinaList.find((o) => o.id === orden.id)
check("KDS ve la orden", !!enCocina)
check("Ítems del KDS traen 'categoria' (estación)", !!enCocina && enCocina.items.every((i) => "categoria" in i))

// ── 5. KDS por ítem + orden lista (evento con numeroMesa) ────────────────────
await fetch(`${API}/cocina/ordenes/${orden.id}/iniciar`, anon("PATCH"))
const itemId = orden.items[0].id
const ri = await fetch(`${API}/cocina/ordenes/${orden.id}/items/${itemId}/estado`, anon("PATCH", { estado: "listo" }))
check("Estado de ítem se acepta", ri.status === 200)
const rbad = await fetch(`${API}/cocina/ordenes/${orden.id}/items/${itemId}/estado`, anon("PATCH", { estado: "xxx" }))
check("Estado de ítem inválido rechazado (400)", rbad.status === 400)
await fetch(`${API}/cocina/ordenes/${orden.id}/listo`, anon("PATCH"))

// ── 6. Pago por el total del backend ─────────────────────────────────────────
const totalBackend = (await (await fetch(`${API}/ordenes/${orden.id}`, auth("GET"))).json()).total
const turnoAntes = await (await fetch(`${API}/turnos/${turno.id}`, auth("GET"))).json()
const pago = await (await fetch(`${API}/pagos`, auth("POST", {
  ordenId: orden.id, turnoId: turno.id,
  tenders: [{ metodo: "cash", monto: totalBackend }],
}))).json()
check("Pago registrado", !!pago.id && pago.facturado === false)
const turnoDespues = await (await fetch(`${API}/turnos/${turno.id}`, auth("GET"))).json()
check("Ventas en efectivo del turno suben por el total", near(turnoDespues.ventasEfectivo, turnoAntes.ventasEfectivo + totalBackend))

// ── 7. Factura marca el pago como facturado ──────────────────────────────────
const factura = await (await fetch(`${API}/facturas`, auth("POST", {
  pagoId: pago.id, clienteNombre: "Consumidor Final", clienteRfc: "CF",
}))).json()
check("Factura con folio real", typeof factura.folio === "string" && factura.folio.startsWith("SF-"))
check("Factura con id GUID (no 0)", typeof factura.id === "string" && factura.id.length > 5)
const pagoCheck = await (await fetch(`${API}/pagos/${pago.id}`, auth("GET"))).json()
check("Pago queda facturado=true", pagoCheck.facturado === true)

// ── 8. Auditoría POST + GET ──────────────────────────────────────────────────
const marca = `e2e-${Date.now()}`
const ra = await fetch(`${API}/auditoria`, auth("POST", { accion: "test_e2e", descripcion: marca }))
check("POST /auditoria acepta (200)", ra.status === 200)
const audit = await (await fetch(`${API}/auditoria?accion=test_e2e&porPagina=5`, auth("GET"))).json()
check("Auditoría quedó registrada server-side", (audit.datos || []).some((a) => a.descripcion === marca))

// ── 9. Eventos de tiempo real ────────────────────────────────────────────────
await new Promise((r) => setTimeout(r, 800))
const tipos = eventos.map((e) => e.evento)
check("Evento 'nueva' emitido", tipos.includes("nueva"))
check("Evento 'lista' emitido", tipos.includes("lista"))
check("Evento 'pagada' emitido", tipos.includes("pagada"))
const listaEv = eventos.find((e) => e.evento === "lista")
check("Evento 'lista' incluye numeroMesa", listaEv && listaEv.numeroMesa === mesa.numero, `(${listaEv?.numeroMesa} vs ${mesa.numero})`)

await conn.stop()
console.log(`\nRESULTADO: ${pass} ✓ / ${fail} ✗   (orden de prueba ${orden.id.slice(0, 8)} quedó pagada+facturada en la BD de dev)`)
process.exit(fail === 0 ? 0 : 1)
