"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChefHat, ShoppingCart, UtensilsCrossed, Package, DollarSign, Users, BarChart3 } from "lucide-react"
import { FACTURACION_HABILITADA } from "@/lib/features"

interface ModuleCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: string
  requiresAuth: boolean
  disabled?: boolean
  disabledNote?: string
}

export default function HomePage() {
  const router = useRouter()

  const modules: ModuleCard[] = [
    {
      id: "pos",
      title: "Punto de Venta",
      description: "Gestión de mesas, pedidos y ventas en tiempo real",
      icon: <ShoppingCart className="w-8 h-8" />,
      href: "/pos/login",
      color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
      requiresAuth: true,
    },
    {
      id: "kitchen",
      title: "Cocina",
      description: "Monitor de pedidos para el área de cocina",
      icon: <UtensilsCrossed className="w-8 h-8" />,
      href: "/kitchen",
      color: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
      requiresAuth: false,
    },
    {
      id: "inventory",
      title: "Inventario",
      description: "Control de productos, stock y proveedores",
      icon: <Package className="w-8 h-8" />,
      href: "/inventory/login",
      color: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      requiresAuth: true,
    },
    {
      id: "billing",
      title: "Facturación",
      description: "Gestión de facturas electrónicas (FEL Guatemala)",
      icon: <DollarSign className="w-8 h-8" />,
      href: "/billing/login",
      color: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
      requiresAuth: true,
      disabled: !FACTURACION_HABILITADA,
      disabledNote: "Próximamente (FEL)",
    },
    {
      id: "reports",
      title: "Reportes",
      description: "Análisis de ventas, estadísticas y métricas",
      icon: <BarChart3 className="w-8 h-8" />,
      href: "/reports/login",
      color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
      requiresAuth: true,
    },
    {
      id: "admin",
      title: "Administración",
      description: "Gestión de personal, roles y configuración",
      icon: <Users className="w-8 h-8" />,
      href: "/admin/login",
      color: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
      requiresAuth: true,
    },
  ]

  const handleModuleClick = (module: ModuleCard) => {
    if (module.disabled) return
    router.push(module.href)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <ChefHat className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Sistema de Gestión</h1>
              <p className="text-sm text-muted-foreground">Restaurante</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-bold mb-3">Panel de Control</h2>
          <p className="text-muted-foreground text-lg">Seleccione un módulo para comenzar</p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {modules.map((module) => (
            <Card
              key={module.id}
              className={`border-border transition-all group ${module.disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-primary/50 cursor-pointer hover:shadow-lg"}`}
              onClick={() => handleModuleClick(module)}
            >
              <CardHeader>
                <div
                  className={`w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-colors ${module.color}`}
                >
                  {module.icon}
                </div>
                <CardTitle className={module.disabled ? "" : "group-hover:text-primary transition-colors"}>
                  {module.title}
                  {module.disabled && module.disabledNote && (
                    <span className="ml-2 text-xs font-normal text-amber-500">({module.disabledNote})</span>
                  )}
                  {!module.disabled && !module.requiresAuth && (
                    <span className="ml-2 text-xs font-normal text-green-500">(Acceso Libre)</span>
                  )}
                </CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  disabled={module.disabled}
                  className={`w-full transition-colors bg-transparent ${module.disabled ? "" : "group-hover:bg-primary group-hover:text-primary-foreground"}`}
                >
                  {module.disabled ? "No disponible" : module.requiresAuth ? "Ingresar" : "Abrir"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-16 max-w-2xl mx-auto text-center">
          <Card className="border-border bg-muted/50">
            <CardHeader>
              <CardTitle className="text-xl">Información del Sistema</CardTitle>
              <CardDescription className="text-base">
                Los módulos con autenticación requieren credenciales autorizadas por el administrador. El módulo de
                Cocina tiene acceso libre para facilitar las operaciones.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  )
}
