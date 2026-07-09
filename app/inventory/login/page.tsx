"use client"

import ModuleLoginForm from "@/components/module-login-form"
import { Package } from "lucide-react"

export default function InventoryLoginPage() {
  return (
    <ModuleLoginForm
      module="inventory"
      title="Inventario"
      Icon={Package}
      iconBgClass="bg-orange-500/10"
      iconColorClass="text-orange-500"
      selectEstablecimiento
    />
  )
}
