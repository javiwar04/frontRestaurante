/**
 * Vistas ocultas que solo se muestran al imprimir (media print):
 * ticket de pago/precuenta y reportes de caja.
 */
import { getModifiersPrice, type NegocioInfo, type PrintReportData, type PrintTicketData } from "./types"

// Hora local de Guatemala (UTC-6) sin depender de la zona del dispositivo,
// que en algunos equipos/servidores está en UTC y mostraba +6h de más.
function fmtFechaGt(d: Date): string {
  return d.toLocaleString("es-GT", {
    timeZone: "America/Guatemala",
    dateStyle: "short",
    timeStyle: "medium",
  })
}

function TicketHeader({ negocio }: { negocio: NegocioInfo }) {
  return (
    <div className="text-center">
      <div className="font-bold text-base leading-tight">{negocio.nombre || "Restaurante"}</div>
      {negocio.direccion && <div className="text-[10px] leading-tight">{negocio.direccion}</div>}
      {negocio.telefono && <div className="text-[10px] leading-tight">Tel: {negocio.telefono}</div>}
    </div>
  )
}

export function PrintTicketView({ ticket, taxRate, negocio }: {
  ticket: PrintTicketData | null
  taxRate: number
  negocio: NegocioInfo
}) {
  if (!ticket) return null
  const sub = ticket.items.reduce((s, i) => s + (i.price + getModifiersPrice(i.modifiers)) * i.quantity, 0)
  const disc = ticket.discountAmount || 0
  const tip = ticket.tipAmount || 0
  const tax = Math.max(0, sub - disc) * taxRate
  const total = Math.max(0, sub - disc) + tax + tip

  return (
    <div className="print-only print-ticket mx-auto text-xs text-black">
      <div className="p-3">
        <TicketHeader negocio={negocio} />
        <div className="my-2 border-t border-dashed border-black" />
        <div className="text-center font-bold">{ticket.kind === "payment" ? "RECIBO DE PAGO" : "PRECUENTA"}</div>
        <div className="mt-1 flex items-start justify-between text-[11px]">
          <span>Ticket: {ticket.ticketId || "-"}</span>
          <span>{fmtFechaGt(ticket.timestamp)}</span>
        </div>
        <div className="mt-1 text-[11px]">
          <div>Mesa: {ticket.tableNumber ?? "-"}</div>
          <div>Mesero: {ticket.waiterName || "-"}</div>
          <div>Comensales: {ticket.diners || 1}</div>
          {ticket.kind === "payment" && <div>Cajero: {ticket.paidBy}</div>}
        </div>
        <div className="my-2 border-t border-dashed border-black" />
        {ticket.items.map((item, idx) => {
          const unit = item.price + getModifiersPrice(item.modifiers)
          return (
            <div key={idx} className="break-inside-avoid">
              <div className="flex justify-between"><span className="font-semibold">{item.quantity} x {item.name}</span><span>Q{(unit * item.quantity).toFixed(2)}</span></div>
              {item.modifiers?.map((m, i) => <div key={i} className="pl-2 text-[10px]">- {m.group}: {m.option}</div>)}
              {item.notes && <div className="pl-2 italic text-[10px]">Obs: {item.notes}</div>}
            </div>
          )
        })}
        <div className="my-2 border-t border-dashed border-black" />
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between"><span>Subtotal</span><span>Q{sub.toFixed(2)}</span></div>
          {disc > 0 && <div className="flex justify-between"><span>Descuento</span><span>-Q{disc.toFixed(2)}</span></div>}
          <div className="flex justify-between"><span>IVA ({(taxRate * 100).toFixed(0)}%)</span><span>Q{tax.toFixed(2)}</span></div>
          {tip > 0 && <div className="flex justify-between"><span>Propina</span><span>Q{tip.toFixed(2)}</span></div>}
          <div className="border-t border-dashed border-black my-1" />
          <div className="flex justify-between font-bold"><span>Total</span><span>Q{total.toFixed(2)}</span></div>
          {ticket.kind === "payment" && ticket.tenders.length > 0 && (<>
            <div className="border-t border-dashed border-black my-1" />
            <div className="font-bold">Forma de pago</div>
            {ticket.tenders.map((t) => (
              <div key={t.id} className="flex justify-between">
                <span>{t.method === "cash" ? "Efectivo" : t.method === "card" ? `Tarjeta${t.cardBatch ? ` (${t.cardBatch})` : ""}` : `Depósito${t.transferRef ? ` (${t.transferRef})` : ""}`}</span>
                <span>Q{t.amount.toFixed(2)}</span>
              </div>
            ))}
          </>)}
        </div>
        <div className="my-2 border-t border-dashed border-black" />
        <div className="text-center text-[10px]">{negocio.ticketFooter || "¡Gracias por su preferencia!"}</div>
      </div>
    </div>
  )
}

export function PrintReportView({ report, cashierName, negocio }: {
  report: PrintReportData | null
  cashierName: string
  negocio: NegocioInfo
}) {
  if (!report) return null
  return (
    <div className="print-only print-ticket mx-auto text-xs text-black">
      <div className="p-3">
        <TicketHeader negocio={negocio} />
        <div className="my-2 border-t border-dashed border-black" />
        <div className="text-center font-bold">{report.title || "REPORTE"}</div>
        <div className="text-[10px] text-center mt-1">{new Date().toLocaleString()}</div>
        <div className="text-[10px] text-center">Cajero: {cashierName}</div>
        <div className="my-2 border-t border-dashed border-black" />
        {report.lines.map((line, i) => {
          if (line === "---") return <div key={i} className="my-1 border-t border-dashed border-black" />
          if (line.startsWith("##")) return <div key={i} className="font-bold mt-2 mb-1">{line.slice(2).trim()}</div>
          if (line.includes("|")) {
            const [left, right] = line.split("|").map(s => s.trim())
            return <div key={i} className="flex justify-between"><span>{left}</span><span className="font-medium">{right}</span></div>
          }
          return <div key={i}>{line}</div>
        })}
        <div className="my-2 border-t border-dashed border-black" />
        <div className="text-center text-[10px]">*** Fin del reporte ***</div>
      </div>
    </div>
  )
}
