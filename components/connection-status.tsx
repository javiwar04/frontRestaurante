"use client"

/**
 * Barra global "Sin conexión". Aparece fija arriba cuando el dispositivo
 * pierde la red (evento offline del navegador) y desaparece al reconectar.
 * Es un aviso pasivo para el personal: si algo falla, sabrán que es la red
 * y no el sistema. No bloquea la UI ni encola nada (eso sería modo offline).
 */
import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export function ConnectionStatus() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    // Estado inicial (navigator solo existe en el cliente)
    setOffline(!navigator.onLine)
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener("offline", goOffline)
    window.addEventListener("online", goOnline)
    return () => {
      window.removeEventListener("offline", goOffline)
      window.removeEventListener("online", goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 bg-red-600 py-1.5 text-sm font-medium text-white shadow-md">
      <WifiOff className="h-4 w-4" />
      Sin conexión — verifica tu red. El sistema se reanudará al reconectar.
    </div>
  )
}
