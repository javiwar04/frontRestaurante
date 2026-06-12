/**
 * Conexión SignalR al hub del backend (/hubs/restaurante).
 * El servidor emite "ordenes:cambio" cuando una orden cambia; los clientes
 * refrescan su lista. El polling existente queda como respaldo si la
 * conexión no está disponible.
 */
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr"
import { API_BASE } from "./api"

export interface OrdenCambioEvent {
  evento: "nueva" | "actualizada" | "lista" | "pagada" | "cancelada" | string
  ordenId: string
}

/**
 * Abre la conexión y suscribe el callback. Devuelve la conexión para que el
 * caller la detenga en su cleanup (`conn.stop()`). Reintenta automáticamente.
 */
export function connectRealtime(onOrdenesCambio: (e: OrdenCambioEvent) => void): HubConnection {
  const conn = new HubConnectionBuilder()
    .withUrl(`${API_BASE}/hubs/restaurante`)
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()

  conn.on("ordenes:cambio", (e: OrdenCambioEvent) => onOrdenesCambio(e))

  conn.start().catch(() => {
    // Sin tiempo real: el polling de cada página sigue funcionando
  })

  return conn
}

export function isConnected(conn: HubConnection | null): boolean {
  return conn?.state === HubConnectionState.Connected
}
