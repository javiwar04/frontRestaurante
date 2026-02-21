"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, CheckCircle2, ChefHat } from "lucide-react"

// Mock orders data
const mockOrders = [
  {
    id: 1,
    table: 2,
    items: [
      { name: "Hamburguesa Clásica", quantity: 2, notes: "Sin cebolla" },
      { name: "Papas Fritas", quantity: 2, notes: "" },
    ],
    status: "pending",
    time: "2 min",
    priority: "high",
  },
  {
    id: 2,
    table: 5,
    items: [
      { name: "Pizza Margarita", quantity: 1, notes: "Extra queso" },
      { name: "Ensalada César", quantity: 1, notes: "" },
    ],
    status: "preparing",
    time: "8 min",
    priority: "normal",
  },
  {
    id: 3,
    table: 7,
    items: [
      { name: "Pasta Carbonara", quantity: 1, notes: "" },
      { name: "Alitas Picantes", quantity: 1, notes: "Muy picante" },
      { name: "Cerveza Artesanal", quantity: 2, notes: "" },
    ],
    status: "preparing",
    time: "12 min",
    priority: "normal",
  },
  {
    id: 4,
    table: 1,
    items: [
      { name: "Ensalada César", quantity: 2, notes: "" },
      { name: "Limonada Natural", quantity: 2, notes: "" },
    ],
    status: "pending",
    time: "1 min",
    priority: "high",
  },
  {
    id: 5,
    table: 4,
    items: [
      { name: "Tiramisú", quantity: 1, notes: "" },
      { name: "Brownie con Helado", quantity: 1, notes: "" },
    ],
    status: "ready",
    time: "15 min",
    priority: "normal",
  },
]

export default function KitchenPage() {
  const router = useRouter()
  const [orders, setOrders] = useState(mockOrders)
  const [filter, setFilter] = useState<"all" | "pending" | "preparing" | "ready">("all")

  const filteredOrders = filter === "all" ? orders : orders.filter((order) => order.status === filter)

  const updateOrderStatus = (orderId: number, newStatus: "pending" | "preparing" | "ready") => {
    setOrders(orders.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "preparing":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
      case "ready":
        return "bg-green-500/10 text-green-500 border-green-500/20"
      default:
        return ""
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "preparing":
        return "Preparando"
      case "ready":
        return "Listo"
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/")} title="Volver al panel">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Monitor de Cocina</h1>
                <p className="text-xs text-muted-foreground">Acceso Libre - Sin autenticación</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                <Clock className="w-3 h-3 mr-1" />
                {filteredOrders.length} pedidos
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            Todos ({orders.length})
          </Button>
          <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
            Pendientes ({orders.filter((o) => o.status === "pending").length})
          </Button>
          <Button variant={filter === "preparing" ? "default" : "outline"} onClick={() => setFilter("preparing")}>
            Preparando ({orders.filter((o) => o.status === "preparing").length})
          </Button>
          <Button variant={filter === "ready" ? "default" : "outline"} onClick={() => setFilter("ready")}>
            Listos ({orders.filter((o) => o.status === "ready").length})
          </Button>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className={`border-2 ${getStatusColor(order.status)}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Mesa {order.table}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={order.priority === "high" ? "destructive" : "secondary"} className="text-xs">
                        {order.priority === "high" ? "Urgente" : "Normal"}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {order.time}
                      </span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(order.status)}>{getStatusText(order.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32 mb-4">
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {item.quantity}x {item.name}
                          </span>
                        </div>
                        {item.notes && <p className="text-xs text-muted-foreground italic">Nota: {item.notes}</p>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  {order.status === "pending" && (
                    <Button className="w-full" size="sm" onClick={() => updateOrderStatus(order.id, "preparing")}>
                      <ChefHat className="w-4 h-4 mr-1" />
                      Iniciar
                    </Button>
                  )}
                  {order.status === "preparing" && (
                    <Button className="w-full" size="sm" onClick={() => updateOrderStatus(order.id, "ready")}>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Marcar Listo
                    </Button>
                  )}
                  {order.status === "ready" && (
                    <Button className="w-full bg-transparent" size="sm" variant="outline" disabled>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Completado
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-20">
            <ChefHat className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No hay pedidos</h2>
            <p className="text-muted-foreground">Los nuevos pedidos aparecerán aquí automáticamente</p>
          </div>
        )}
      </main>
    </div>
  )
}
