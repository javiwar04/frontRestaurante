"use client"

/**
 * Recibo para REIMPRESIÓN desde Reportes. A diferencia del ticket del POS,
 * usa los totales que YA calculó el backend en la orden (subtotal, impuestos,
 * total) para que la reimpresión sea idéntica al cobro original, sin recalcular.
 */
import type { Orden, Pago } from "@/lib/api"

export interface ReprintData {
  orden: Orden
  pago: Pago
  negocio: { nombre?: string; direccion?: string | null; telefono?: string | null }
}

// Hora local de Guatemala (los timestamps se guardan en UTC).
function fmtFechaGt(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", {
    timeZone: "America/Guatemala",
    dateStyle: "short",
    timeStyle: "medium",
  })
}

const METODO_LABEL: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Depósito" }

export function ReprintReceiptView({ data }: { data: ReprintData | null }) {
  if (!data) return null
  const { orden, pago, negocio } = data
  const desc = orden.descuento || 0
  const tip = orden.propina || 0

  return (
    <div className="print-only print-ticket mx-auto text-xs text-black">
      <div className="p-3">
        <div className="text-center">
          <div className="font-bold text-base leading-tight">{negocio.nombre || "Restaurante"}</div>
          {negocio.direccion && <div className="text-[10px] leading-tight">{negocio.direccion}</div>}
          {negocio.telefono && <div className="text-[10px] leading-tight">Tel: {negocio.telefono}</div>}
        </div>
        <div className="my-2 border-t border-dashed border-black" />
        <div className="text-center font-bold">RECIBO DE PAGO</div>
        <div className="text-center text-[10px]">(reimpresión)</div>
        <div className="mt-1 flex items-start justify-between text-[11px]">
          <span>Ticket: {pago.ordenId}</span>
          <span>{fmtFechaGt(pago.registradoEn)}</span>
        </div>
        <div className="mt-1 text-[11px]">
          <div>Mesa: {orden.numeroMesa ?? "-"}</div>
          <div>Mesero: {orden.meseroNombre || pago.meseroNombre || "-"}</div>
          <div>Comensales: {orden.comensales || 1}</div>
        </div>
        <div className="my-2 border-t border-dashed border-black" />
        {orden.items.map((item, idx) => {
          const delta = (item.modificadores || []).reduce((s, m) => s + (m.precioDelta || 0), 0)
          const unit = item.precioUnitario + delta
          const nombre = item.platilloNombre || item.nombre || "Producto"
          return (
            <div key={idx} className="break-inside-avoid">
              <div className="flex justify-between">
                <span className="font-semibold">{item.cantidad} x {nombre}</span>
                <span>Q{(unit * item.cantidad).toFixed(2)}</span>
              </div>
              {(item.modificadores || []).map((m, i) => (
                <div key={i} className="pl-2 text-[10px]">- {m.grupoNombre}: {m.opcionNombre}</div>
              ))}
              {item.notas && <div className="pl-2 italic text-[10px]">Obs: {item.notas}</div>}
            </div>
          )
        })}
        <div className="my-2 border-t border-dashed border-black" />
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between"><span>Subtotal</span><span>Q{orden.subtotal.toFixed(2)}</span></div>
          {desc > 0 && <div className="flex justify-between"><span>Descuento</span><span>-Q{desc.toFixed(2)}</span></div>}
          <div className="flex justify-between"><span>IVA</span><span>Q{orden.impuestos.toFixed(2)}</span></div>
          {tip > 0 && <div className="flex justify-between"><span>Propina</span><span>Q{tip.toFixed(2)}</span></div>}
          <div className="border-t border-dashed border-black my-1" />
          <div className="flex justify-between font-bold"><span>Total</span><span>Q{orden.total.toFixed(2)}</span></div>
          {pago.tenders.length > 0 && (<>
            <div className="border-t border-dashed border-black my-1" />
            <div className="font-bold">Forma de pago</div>
            {pago.tenders.map((t, i) => (
              <div key={i} className="flex justify-between">
                <span>
                  {METODO_LABEL[t.metodo] || t.metodo}
                  {t.referenciaLote ? ` (${t.referenciaLote})` : ""}
                  {t.referenciaTransf ? ` (${t.referenciaTransf})` : ""}
                </span>
                <span>Q{t.monto.toFixed(2)}</span>
              </div>
            ))}
          </>)}
        </div>
        <div className="my-2 border-t border-dashed border-black" />
        <div className="text-center text-[10px]">¡Gracias por su preferencia!</div>
      </div>
    </div>
  )
}
