"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, ArrowLeft, Lock, Shield } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [credentials, setCredentials] = useState({ username: "", password: "" })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    setTimeout(() => {
      // Only admin can access this module
      if (credentials.username === "admin" && credentials.password === "admin") {
        localStorage.setItem(
          "module_session_admin",
          JSON.stringify({
            username: credentials.username,
            module: "admin",
            timestamp: Date.now(),
          }),
        )
        router.push("/admin")
      } else {
        setError("Acceso denegado. Solo administradores pueden ingresar a este módulo.")
        setIsLoading(false)
      }
    }, 800)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Panel
        </Button>

        <Card className="border-border border-red-500/20">
          <CardHeader className="space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-red-500" />
                <CardTitle className="text-2xl">Administración</CardTitle>
              </div>
              <CardDescription className="mt-2">Módulo restringido. Solo administradores autorizados.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  placeholder="Ingrese su usuario"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="Ingrese su contraseña"
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verificando..." : "Ingresar al Módulo"}
              </Button>

              <div className="text-xs text-muted-foreground text-center pt-4 border-t">
                <p className="font-medium mb-1">Credenciales de administrador:</p>
                <p>Usuario: admin | Contraseña: admin</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
