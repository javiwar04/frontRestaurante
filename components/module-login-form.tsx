"use client"

import type React from "react"
import type { LucideIcon } from "lucide-react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Lock } from "lucide-react"
import { authLogin, saveSession } from "@/lib/api"

interface ModuleLoginFormProps {
  /** Internal module key, e.g. "pos", "admin", "kitchen" */
  module: string
  /** Human-readable title shown in the card */
  title: string
  /** Optional subtitle */
  description?: string
  /** Icon component displayed at the top of the card */
  Icon: LucideIcon
  /** Tailwind colour class for the icon background, e.g. "bg-blue-500/10" */
  iconBgClass?: string
  /** Tailwind colour class for the icon itself, e.g. "text-blue-500" */
  iconColorClass?: string
}

export default function ModuleLoginForm({
  module,
  title,
  description = "Ingrese sus credenciales para acceder al módulo",
  Icon,
  iconBgClass = "bg-primary/10",
  iconColorClass = "text-primary",
}: ModuleLoginFormProps) {
  const router = useRouter()
  const [credentials, setCredentials] = useState({ username: "", pin: "" })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const data = await authLogin(credentials.username, credentials.pin)

      // Verify the user has access to this module
      if (!data.user.modules.includes(module)) {
        setError(`Su usuario no tiene acceso al módulo "${title}".`)
        setIsLoading(false)
        return
      }

      // Persist session
      saveSession(module, { token: data.token, user: data.user })

      // Navigate into the module
      router.push(`/${module}`)
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Error al conectar con el servidor"
      setError(msg)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => router.push("/")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Panel
        </Button>

        <Card className="border-border">
          <CardHeader className="space-y-4">
            <div
              className={`w-16 h-16 ${iconBgClass} rounded-xl flex items-center justify-center mx-auto`}
            >
              <Icon className={`w-8 h-8 ${iconColorClass}`} />
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription className="mt-2">{description}</CardDescription>
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
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  value={credentials.pin}
                  onChange={(e) => setCredentials({ ...credentials, pin: e.target.value })}
                  placeholder="Ingrese su PIN"
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verificando…" : "Ingresar al Módulo"}
              </Button>

              <p className="text-xs text-muted-foreground text-center pt-3 border-t">
                Contacte al administrador si olvidó su PIN.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
