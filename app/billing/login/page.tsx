"use client"

import ModuleLoginForm from "@/components/module-login-form"
import { DollarSign } from "lucide-react"

export default function BillingLoginPage() {
  return (
    <ModuleLoginForm
      module="billing"
      title="Facturación"
      Icon={DollarSign}
      iconBgClass="bg-emerald-500/10"
      iconColorClass="text-emerald-500"
    />
  )
}
