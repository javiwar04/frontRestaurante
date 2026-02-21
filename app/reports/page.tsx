"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BarChart3 } from "lucide-react"

export default function ReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ username: string; module: string } | null>(null)

  useEffect(() => {
    const sessionStr = localStorage.getItem("module_session_reports")
    if (!sessionStr) {
      router.push("/")
      return
    }
    setUser(JSON.parse(sessionStr))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("module_session_reports")
    router.push("/")
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/")} title="Volver al panel">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Reportes</h1>
                <p className="text-xs text-muted-foreground">Usuario: {user.username}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="text-center py-20">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Módulo de Reportes</h2>
          <p className="text-muted-foreground">Sistema de reportes y análisis en desarrollo</p>
        </div>
      </main>
    </div>
  )
}
