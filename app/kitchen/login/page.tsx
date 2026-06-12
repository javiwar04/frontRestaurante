"use client"

import ModuleLoginForm from "@/components/module-login-form"
import { ChefHat } from "lucide-react"

export default function KitchenLoginPage() {
  return (
    <ModuleLoginForm
      module="kitchen"
      title="Cocina"
      Icon={ChefHat}
      iconBgClass="bg-orange-500/10"
      iconColorClass="text-orange-500"
    />
  )
}
