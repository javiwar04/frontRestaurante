"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home } from "lucide-react"

interface ModuleLayoutProps {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
}

export function ModuleLayout({ title, description, icon, children }: ModuleLayoutProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  {icon}
                </div>
                <div>
                  <h1 className="text-xl font-bold">{title}</h1>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              <Home className="w-4 h-4 mr-2" />
              Inicio
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
