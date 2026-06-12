"use client"

import ModuleLoginForm from "@/components/module-login-form"
import { Shield } from "lucide-react"

export default function AdminLoginPage() {
  return (
    <ModuleLoginForm
      module="admin"
      title="Administración"
      description="Módulo restringido. Solo administradores autorizados."
      Icon={Shield}
      iconBgClass="bg-red-500/10"
      iconColorClass="text-red-500"
    />
  )
}
