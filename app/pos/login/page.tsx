"use client"

import ModuleLoginForm from "@/components/module-login-form"
import { ShoppingCart } from "lucide-react"

export default function POSLoginPage() {
  return (
    <ModuleLoginForm
      module="pos"
      title="Punto de Venta"
      Icon={ShoppingCart}
      iconBgClass="bg-blue-500/10"
      iconColorClass="text-blue-500"
      selectEstablecimiento
    />
  )
}
