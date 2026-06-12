// Prueba e2e del hub SignalR: escucha "ordenes:cambio" mientras se ejercitan
// los endpoints (crear orden, item listo, orden lista, reiniciar).
// Uso: node scripts/test-realtime.mjs
import signalR from "@microsoft/signalr"

const API = "http://localhost:5006"
const eventos = []

const conn = new signalR.HubConnectionBuilder()
  .withUrl(`${API}/hubs/restaurante`)
  .configureLogging(signalR.LogLevel.Error)
  .build()

conn.on("ordenes:cambio", (e) => {
  eventos.push(e)
  console.log(`  [evento] ${e.evento} -> ${e.ordenId.slice(0, 8)}`)
})

const json = (m, b) => ({ method: m, headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TOKEN}` }, body: b ? JSON.stringify(b) : undefined })

await conn.start()
console.log("HUB conectado:", conn.state)

// 1. Crear orden (evento "nueva")
const turno = await (await fetch(`${API}/turnos/activo`, json("GET"))).json()
const secs = await (await fetch(`${API}/secciones`, json("GET"))).json()
const plats = await (await fetch(`${API}/platillos`, json("GET"))).json()
const mesa = secs.flatMap((s) => s.mesas)[1] ?? secs.flatMap((s) => s.mesas)[0]
const orden = await (await fetch(`${API}/ordenes`, json("POST", {
  mesaId: mesa.id, turnoId: turno.id, tipoServicio: "mesa",
  items: [{ platilloId: plats[0].id, nombre: plats[0].nombre, cantidad: 1, precioUnitario: plats[0].precio }],
}))).json()
console.log(`ORDEN creada: ${orden.id.slice(0, 8)} estado=${orden.estado} (cocina debe verla como Pendiente)`)

// 2. Cocina: iniciar, item listo, orden lista, reiniciar (endpoints anónimos)
const anon = (m, b) => ({ method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined })
const cocinaList = await (await fetch(`${API}/cocina/ordenes`)).json()
const enCocina = cocinaList.find((o) => o.id === orden.id)
console.log(`COCINA ve la orden: ${enCocina ? "SI" : "NO"} (estado=${enCocina?.estado})`)

await fetch(`${API}/cocina/ordenes/${orden.id}/iniciar`, anon("PATCH"))
const itemId = orden.items[0].id
const r1 = await fetch(`${API}/cocina/ordenes/${orden.id}/items/${itemId}/estado`, anon("PATCH", { estado: "listo" }))
console.log(`ITEM estado -> listo: ${r1.status}`)
const check = (await (await fetch(`${API}/cocina/ordenes`)).json()).find((o) => o.id === orden.id)
console.log(`ITEM persistido tras refetch: estado=${check?.items[0]?.estado} (esperado: listo)`)

const r2 = await fetch(`${API}/cocina/ordenes/${orden.id}/items/${itemId}/estado`, anon("PATCH", { estado: "invalido" }))
console.log(`ESTADO invalido rechazado: ${r2.status} (esperado: 400)`)

await fetch(`${API}/cocina/ordenes/${orden.id}/listo`, anon("PATCH"))
await fetch(`${API}/cocina/ordenes/${orden.id}/reiniciar`, anon("PATCH"))

// 3. Cancelar la orden de prueba (no dejar basura activa)
await fetch(`${API}/ordenes/${orden.id}`, json("DELETE"))

await new Promise((r) => setTimeout(r, 800))
console.log(`\nTOTAL eventos recibidos: ${eventos.length} ->`, eventos.map((e) => e.evento).join(", "))
await conn.stop()
process.exit(eventos.length >= 6 ? 0 : 1)
