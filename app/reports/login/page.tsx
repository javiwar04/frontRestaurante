"use client"

import ModuleLoginForm from "@/components/module-login-form"
import { BarChart3 } from "lucide-react"

export default function ReportsLoginPage() {
  return (
    <ModuleLoginForm
      module="reports"
      title="Reportes"
      Icon={BarChart3}
      iconBgClass="bg-violet-500/10"
      iconColorClass="text-violet-500"
    />
  )
}
