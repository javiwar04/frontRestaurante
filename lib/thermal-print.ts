"use client"

import { getModifiersPrice, type NegocioInfo, type PrintReportData, type PrintTicketData } from "@/app/pos/types"
import type { Orden, Pago } from "@/lib/api"

type PrintableWindow = Window | null

const METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Deposito",
}

export function openThermalPrintWindow(): PrintableWindow {
  if (typeof window === "undefined") return null
  return window.open("", "_blank", "popup=yes,width=360,height=640")
}

export function printThermalHtml(title: string, bodyHtml: string, targetWindow?: PrintableWindow) {
  if (typeof window === "undefined") return
  const printWindow = targetWindow ?? openThermalPrintWindow()
  if (!printWindow) {
    window.print()
    return
  }

  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    html, body {
      width: 80mm;
      min-width: 80mm;
      max-width: 80mm;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
    }
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 11px;
      line-height: 1.25;
    }
    .ticket {
      width: 80mm;
      max-width: 80mm;
      box-sizing: border-box;
      padding: 3mm;
    }
    * { box-sizing: border-box; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .small { font-size: 10px; }
    .tiny { font-size: 9px; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .left { min-width: 0; overflow-wrap: anywhere; }
    .right { white-space: nowrap; text-align: right; }
    .indent { padding-left: 8px; }
    @media screen {
      body { display: block; }
    }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    setTimeout(() => printWindow.close(), 600)
  }, 250)
}

export function buildTicketHtml(ticket: PrintTicketData, taxRate: number, negocio: NegocioInfo) {
  const sub = ticket.items.reduce((s, i) => s + (i.price + getModifiersPrice(i.modifiers)) * i.quantity, 0)
  const disc = ticket.discountAmount || 0
  const tip = ticket.tipAmount || 0
  const tax = Math.max(0, sub - disc) * taxRate
  const total = Math.max(0, sub - disc) + tax + tip

  return ticketShell([
    headerHtml(negocio),
    separator(),
    center(ticket.kind === "payment" ? "RECIBO DE PAGO" : "PRECUENTA", "bold"),
    row(`Ticket: ${ticket.ticketId || "-"}`, fmtFechaGt(ticket.timestamp)),
    text(`Mesa: ${ticket.tableNumber ?? "-"}`),
    text(`Cliente: ${ticket.customerName || "Consumidor Final"}`),
    text(`Mesero: ${ticket.waiterName || "-"}`),
    text(`Comensales: ${ticket.diners || 1}`),
    ticket.kind === "payment" ? text(`Cajero: ${ticket.paidBy || "-"}`) : "",
    separator(),
    ticket.items.map((item) => {
      const unit = item.price + getModifiersPrice(item.modifiers)
      return [
        row(`${item.quantity} x ${item.name}`, `Q${(unit * item.quantity).toFixed(2)}`, "bold"),
        item.modifiers?.map((m) => text(`- ${m.group}: ${m.option}`, "tiny indent")).join("") ?? "",
        item.notes ? text(`Obs: ${item.notes}`, "tiny indent") : "",
      ].join("")
    }).join(""),
    separator(),
    row("Subtotal", `Q${sub.toFixed(2)}`),
    disc > 0 ? row("Descuento", `-Q${disc.toFixed(2)}`) : "",
    row(`IVA (${(taxRate * 100).toFixed(0)}%)`, `Q${tax.toFixed(2)}`),
    tip > 0 ? row("Propina", `Q${tip.toFixed(2)}`) : "",
    separator(),
    row("Total", `Q${total.toFixed(2)}`, "bold"),
    ticket.kind === "payment" && ticket.tenders.length > 0 ? [
      separator(),
      text("Forma de pago", "bold"),
      ticket.tenders.map((t) => row(tenderLabel(t.method, t.cardBatch, t.transferRef), `Q${t.amount.toFixed(2)}`)).join(""),
    ].join("") : "",
    separator(),
    center(negocio.ticketFooter || "Gracias por su preferencia!", "tiny"),
  ].join(""))
}

export function buildReportHtml(report: PrintReportData, cashierName: string, negocio: NegocioInfo) {
  return ticketShell([
    headerHtml(negocio),
    separator(),
    center(report.title || "REPORTE", "bold"),
    center(new Date().toLocaleString("es-GT"), "tiny"),
    center(`Cajero: ${cashierName}`, "tiny"),
    separator(),
    report.lines.map((line) => {
      if (line === "---") return separator()
      if (line.startsWith("##")) return text(line.slice(2).trim(), "bold")
      if (line.includes("|")) {
        const [left, right] = line.split("|").map((s) => s.trim())
        return row(left, right)
      }
      return text(line)
    }).join(""),
    separator(),
    center("*** Fin del reporte ***", "tiny"),
  ].join(""))
}

export function buildReprintReceiptHtml(data: {
  orden: Orden
  pago: Pago
  negocio: { nombre?: string; sucursalNombre?: string | null; direccion?: string | null; telefono?: string | null }
}) {
  const { orden, pago, negocio } = data
  const desc = orden.descuento || 0
  const tip = orden.propina || 0

  return ticketShell([
    headerHtml({ nombre: negocio.nombre || "Tacos Michoacan", sucursalNombre: negocio.sucursalNombre, direccion: negocio.direccion, telefono: negocio.telefono }),
    separator(),
    center("RECIBO DE PAGO", "bold"),
    center("(reimpresion)", "tiny"),
    row(`Ticket: ${pago.ticketCorrelativo || pago.ordenId}`, fmtFechaGt(pago.registradoEn)),
    text(`Mesa: ${orden.numeroMesa ?? "-"}`),
    text(`Cliente: ${orden.clienteNombre || "Consumidor Final"}`),
    text(`Mesero: ${orden.meseroNombre || pago.meseroNombre || "-"}`),
    text(`Comensales: ${orden.comensales || 1}`),
    separator(),
    orden.items.map((item) => {
      const delta = (item.modificadores || []).reduce((s, m) => s + (m.precioDelta || 0), 0)
      const unit = item.precioUnitario + delta
      const nombre = item.platilloNombre || item.nombre || "Producto"
      return [
        row(`${item.cantidad} x ${nombre}`, `Q${(unit * item.cantidad).toFixed(2)}`, "bold"),
        (item.modificadores || []).map((m) => text(`- ${m.grupoNombre}: ${m.opcionNombre}`, "tiny indent")).join(""),
        item.notas ? text(`Obs: ${item.notas}`, "tiny indent") : "",
      ].join("")
    }).join(""),
    separator(),
    row("Subtotal", `Q${orden.subtotal.toFixed(2)}`),
    desc > 0 ? row("Descuento", `-Q${desc.toFixed(2)}`) : "",
    row("IVA", `Q${orden.impuestos.toFixed(2)}`),
    tip > 0 ? row("Propina", `Q${tip.toFixed(2)}`) : "",
    separator(),
    row("Total", `Q${orden.total.toFixed(2)}`, "bold"),
    pago.tenders.length > 0 ? [
      separator(),
      text("Forma de pago", "bold"),
      pago.tenders.map((t) => row(tenderLabel(t.metodo, t.referenciaLote, t.referenciaTransf), `Q${t.monto.toFixed(2)}`)).join(""),
    ].join("") : "",
    separator(),
    center("Gracias por su preferencia!", "tiny"),
  ].join(""))
}

function ticketShell(inner: string) {
  return `<div class="ticket">${inner}</div>`
}

function headerHtml(negocio: Partial<NegocioInfo>) {
  return [
    center(negocio.nombre || "Tacos Michoacan", "bold"),
    negocio.sucursalNombre ? center(negocio.sucursalNombre, "bold tiny") : "",
    negocio.direccion ? center(negocio.direccion, "tiny") : "",
    negocio.telefono ? center(`Tel: ${negocio.telefono}`, "tiny") : "",
  ].join("")
}

function tenderLabel(method: string, cardBatch?: string | null, transferRef?: string | null) {
  const base = METHOD_LABEL[method] || method
  const ref = cardBatch || transferRef
  return ref ? `${base} (${ref})` : base
}

function fmtFechaGt(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleString("es-GT", {
    timeZone: "America/Guatemala",
    dateStyle: "short",
    timeStyle: "medium",
  })
}

function separator() {
  return `<div class="line"></div>`
}

function center(value: unknown, className = "") {
  return `<div class="center ${className}">${escapeHtml(value)}</div>`
}

function text(value: unknown, className = "") {
  return `<div class="${className}">${escapeHtml(value)}</div>`
}

function row(left: unknown, right: unknown, className = "") {
  return `<div class="row ${className}"><span class="left">${escapeHtml(left)}</span><span class="right">${escapeHtml(right)}</span></div>`
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
