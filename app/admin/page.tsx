"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Users,
  LayoutGrid,
  UtensilsCrossed,
  Settings,
  CreditCard,
  Percent,
  LogOut,
  Eye,
  EyeOff,
  Shield,
  Building2,
  Tag,
  ChevronDown,
  ChevronUp,
  Receipt,
  Search,
  BookOpen,
  FileX,
  Printer,
  AlertTriangle,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

// ─── Types ────────────────────────────────────────────────────────────────────

type AppModule = "pos" | "kitchen" | "inventory" | "reports" | "billing" | "admin"

interface AppUser {
  id: string
  name: string
  username: string
  pin: string
  role: string
  modules: AppModule[]
  active: boolean
  notes: string
}

interface TableDef {
  id: string
  number: number
  capacity: number
  section: string
  active: boolean
  notes: string
}

interface MenuCategory {
  id: string
  name: string
  order: number
  active: boolean
}

interface MenuItem {
  id: string
  categoryId: string
  name: string
  price: number
  description: string
  available: boolean
}

interface PaymentMethod {
  id: string
  name: string
  active: boolean
  requiresReference: boolean
}

interface BusinessConfig {
  name: string
  rfc: string
  address: string
  phone: string
  email: string
  ticketHeader: string
  ticketFooter: string
  currency: string
  timezone: string
}

interface TaxConfig {
  ivaEnabled: boolean
  ivaRate: number
  ivaIncluded: boolean
  tipEnabled: boolean
  tipSuggested: number
  tipAutoEnabled: boolean
  tipAutoMinGuests: number
  tipAutoRate: number
  serviceChargeEnabled: boolean
  serviceChargeRate: number
}

// ─── Ticket types ────────────────────────────────────────────────────────────

type TicketPaymentMethod = "Efectivo" | "Tarjeta Débito" | "Tarjeta Crédito" | "Transferencia"

interface TicketItem {
  id: string
  name: string
  category: string
  qty: number
  unitPrice: number
}

interface SaleTicket {
  id: string
  date: string
  tableNumber: number
  waiter: string
  cashier: string
  items: TicketItem[]
  subtotal: number
  tax: number
  discount: number
  tip: number
  tipMethod: TicketPaymentMethod
  total: number
  paymentMethod: TicketPaymentMethod
  guestCount: number
  notes: string
  voided: boolean
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const seedUsers: AppUser[] = [
  { id: "u1", name: "Administrador", username: "admin", pin: "0000", role: "Administrador", modules: ["pos", "kitchen", "inventory", "reports", "billing", "admin"], active: true, notes: "" },
  { id: "u2", name: "Cajero 1", username: "cajero1", pin: "1234", role: "Cajero", modules: ["pos", "billing"], active: true, notes: "" },
  { id: "u3", name: "Mesero Juan", username: "juan", pin: "4321", role: "Mesero", modules: ["pos"], active: true, notes: "" },
  { id: "u4", name: "Cocinero Pedro", username: "pedro", pin: "5678", role: "Cocina", modules: ["kitchen"], active: true, notes: "" },
]

const seedTables: TableDef[] = [
  { id: "t1", number: 1, capacity: 2, section: "Interior", active: true, notes: "" },
  { id: "t2", number: 2, capacity: 4, section: "Interior", active: true, notes: "" },
  { id: "t3", number: 3, capacity: 4, section: "Interior", active: true, notes: "" },
  { id: "t4", number: 4, capacity: 6, section: "Interior", active: true, notes: "" },
  { id: "t5", number: 5, capacity: 2, section: "Terraza", active: true, notes: "" },
  { id: "t6", number: 6, capacity: 4, section: "Terraza", active: true, notes: "" },
  { id: "t7", number: 7, capacity: 8, section: "Terraza", active: true, notes: "Mesa familiar" },
  { id: "t8", number: 8, capacity: 4, section: "Barra", active: true, notes: "" },
]

const seedCategories: MenuCategory[] = [
  { id: "c1", name: "Entradas", order: 1, active: true },
  { id: "c2", name: "Platos Principales", order: 2, active: true },
  { id: "c3", name: "Postres", order: 3, active: true },
  { id: "c4", name: "Bebidas", order: 4, active: true },
  { id: "c5", name: "Especialidades", order: 5, active: true },
]

const seedMenuItems: MenuItem[] = [
  { id: "mi1", categoryId: "c1", name: "Ensalada César", price: 9.99, description: "Lechuga romana, crutones, parmesano", available: true },
  { id: "mi2", categoryId: "c1", name: "Alitas de Pollo", price: 10.99, description: "Con salsa BBQ o búfalo", available: true },
  { id: "mi3", categoryId: "c2", name: "Hamburguesa Clásica", price: 12.99, description: "Carne de res, lechuga, jitomate, queso", available: true },
  { id: "mi4", categoryId: "c2", name: "Pizza Margarita", price: 14.99, description: "Salsa de tomate, queso mozzarella, albahaca", available: true },
  { id: "mi5", categoryId: "c2", name: "Pasta Carbonara", price: 13.99, description: "Pasta, tocino, huevo, parmesano", available: true },
  { id: "mi6", categoryId: "c3", name: "Tiramisú", price: 6.99, description: "Postre italiano clásico", available: true },
  { id: "mi7", categoryId: "c3", name: "Helado", price: 5.99, description: "3 sabores a elegir", available: true },
  { id: "mi8", categoryId: "c4", name: "Coca Cola", price: 2.99, description: "600 ml", available: true },
  { id: "mi9", categoryId: "c4", name: "Agua Mineral", price: 1.99, description: "500 ml", available: true },
  { id: "mi10", categoryId: "c4", name: "Cerveza", price: 4.99, description: "355 ml", available: true },
]

const seedPaymentMethods: PaymentMethod[] = [
  { id: "pm1", name: "Efectivo", active: true, requiresReference: false },
  { id: "pm2", name: "Tarjeta Débito", active: true, requiresReference: true },
  { id: "pm3", name: "Tarjeta Crédito", active: true, requiresReference: true },
  { id: "pm4", name: "Transferencia / SPEI", active: true, requiresReference: true },
  { id: "pm5", name: "Vales de Despensa", active: false, requiresReference: false },
  { id: "pm6", name: "Pago en línea", active: false, requiresReference: true },
]

const mkD = (daysAgo: number, hour: number, min = 0) => {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(hour, min, 0, 0); return d.toISOString()
}

const seedAdminTickets: SaleTicket[] = [
  { id: "T001", date: mkD(0,13,15), tableNumber:3, waiter:"Juan",   cashier:"cajero1", guestCount:2, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:31.96, tax:5.11, discount:0,  tip:5.00,  total:42.07,  voided:false, notes:"", items:[{id:"i1",name:"Hamburguesa Clásica",category:"Platos Principales",qty:2,unitPrice:12.99},{id:"i2",name:"Coca Cola",category:"Bebidas",qty:2,unitPrice:2.99}] },
  { id: "T002", date: mkD(0,13,45), tableNumber:5, waiter:"María",  cashier:"cajero1", guestCount:4, paymentMethod:"Tarjeta Débito",  tipMethod:"Tarjeta Débito",  subtotal:69.94, tax:11.19,discount:0,  tip:10.00, total:91.13,  voided:false, notes:"", items:[{id:"i3",name:"Pizza Margarita",category:"Platos Principales",qty:2,unitPrice:14.99},{id:"i4",name:"Ensalada César",category:"Entradas",qty:2,unitPrice:9.99},{id:"i5",name:"Cerveza",category:"Bebidas",qty:4,unitPrice:4.99}] },
  { id: "T003", date: mkD(0,14,20), tableNumber:1, waiter:"Juan",   cashier:"cajero1", guestCount:1, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:15.98, tax:2.56, discount:0,  tip:2.00,  total:20.54,  voided:false, notes:"", items:[{id:"i6",name:"Pasta Carbonara",category:"Platos Principales",qty:1,unitPrice:13.99},{id:"i7",name:"Agua Mineral",category:"Bebidas",qty:1,unitPrice:1.99}] },
  { id: "T004", date: mkD(0,15,5),  tableNumber:7, waiter:"Carlos", cashier:"cajero2", guestCount:6, paymentMethod:"Tarjeta Crédito", tipMethod:"Tarjeta Crédito", subtotal:112.82,tax:18.05,discount:5,  tip:18.00, total:143.87, voided:false, notes:"", items:[{id:"i8",name:"Alitas de Pollo",category:"Entradas",qty:2,unitPrice:10.99},{id:"i9",name:"Hamburguesa Clásica",category:"Platos Principales",qty:3,unitPrice:12.99},{id:"i10",name:"Pizza Margarita",category:"Platos Principales",qty:1,unitPrice:14.99},{id:"i11",name:"Cerveza",category:"Bebidas",qty:6,unitPrice:4.99}] },
  { id: "T005", date: mkD(0,15,50), tableNumber:2, waiter:"María",  cashier:"cajero1", guestCount:2, paymentMethod:"Transferencia",   tipMethod:"Efectivo",        subtotal:30.97, tax:4.96, discount:0,  tip:4.50,  total:40.43,  voided:false, notes:"", items:[{id:"i12",name:"Ensalada César",category:"Entradas",qty:1,unitPrice:9.99},{id:"i13",name:"Pasta Carbonara",category:"Platos Principales",qty:1,unitPrice:13.99},{id:"i14",name:"Tiramisú",category:"Postres",qty:1,unitPrice:6.99}] },
  { id: "T006", date: mkD(0,16,30), tableNumber:4, waiter:"Juan",   cashier:"cajero2", guestCount:3, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:47.94, tax:7.67, discount:0,  tip:7.00,  total:62.61,  voided:false, notes:"", items:[{id:"i15",name:"Hamburguesa Clásica",category:"Platos Principales",qty:3,unitPrice:12.99},{id:"i16",name:"Coca Cola",category:"Bebidas",qty:3,unitPrice:2.99}] },
  { id: "T007", date: mkD(0,17,10), tableNumber:6, waiter:"Carlos", cashier:"cajero2", guestCount:2, paymentMethod:"Tarjeta Débito",  tipMethod:"Tarjeta Débito",  subtotal:37.96, tax:6.07, discount:0,  tip:5.00,  total:49.03,  voided:false, notes:"", items:[{id:"i17",name:"Alitas de Pollo",category:"Entradas",qty:1,unitPrice:10.99},{id:"i18",name:"Pizza Margarita",category:"Platos Principales",qty:1,unitPrice:14.99},{id:"i19",name:"Helado",category:"Postres",qty:2,unitPrice:5.99}] },
  { id: "T008", date: mkD(0,18,0),  tableNumber:8, waiter:"María",  cashier:"cajero1", guestCount:4, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:79.90, tax:12.78,discount:0,  tip:12.00, total:104.68, voided:false, notes:"", items:[{id:"i20",name:"Hamburguesa Clásica",category:"Platos Principales",qty:4,unitPrice:12.99},{id:"i21",name:"Cerveza",category:"Bebidas",qty:4,unitPrice:4.99},{id:"i22",name:"Tiramisú",category:"Postres",qty:2,unitPrice:6.99}] },
  { id: "T009", date: mkD(1,12,30), tableNumber:2, waiter:"Juan",   cashier:"cajero1", guestCount:2, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:23.96, tax:3.83, discount:0,  tip:3.00,  total:30.79,  voided:false, notes:"", items:[{id:"i23",name:"Ensalada César",category:"Entradas",qty:2,unitPrice:9.99},{id:"i24",name:"Agua Mineral",category:"Bebidas",qty:2,unitPrice:1.99}] },
  { id: "T010", date: mkD(1,13,0),  tableNumber:4, waiter:"María",  cashier:"cajero1", guestCount:4, paymentMethod:"Tarjeta Crédito", tipMethod:"Tarjeta Crédito", subtotal:71.94, tax:11.51,discount:0,  tip:14.00, total:97.45,  voided:false, notes:"", items:[{id:"i25",name:"Pizza Margarita",category:"Platos Principales",qty:2,unitPrice:14.99},{id:"i26",name:"Alitas de Pollo",category:"Entradas",qty:2,unitPrice:10.99},{id:"i27",name:"Cerveza",category:"Bebidas",qty:4,unitPrice:4.99}] },
  { id: "T011", date: mkD(1,14,15), tableNumber:7, waiter:"Carlos", cashier:"cajero2", guestCount:8, paymentMethod:"Tarjeta Crédito", tipMethod:"Tarjeta Crédito", subtotal:127.80,tax:20.45,discount:10, tip:25.00, total:163.25, voided:false, notes:"", items:[{id:"i28",name:"Hamburguesa Clásica",category:"Platos Principales",qty:4,unitPrice:12.99},{id:"i29",name:"Pizza Margarita",category:"Platos Principales",qty:2,unitPrice:14.99},{id:"i30",name:"Coca Cola",category:"Bebidas",qty:8,unitPrice:2.99},{id:"i31",name:"Tiramisú",category:"Postres",qty:4,unitPrice:6.99}] },
  { id: "T012", date: mkD(1,15,45), tableNumber:1, waiter:"Juan",   cashier:"cajero1", guestCount:1, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:19.98, tax:3.20, discount:0,  tip:3.00,  total:26.18,  voided:false, notes:"", items:[{id:"i32",name:"Pasta Carbonara",category:"Platos Principales",qty:1,unitPrice:13.99},{id:"i33",name:"Helado",category:"Postres",qty:1,unitPrice:5.99}] },
  { id: "T013", date: mkD(1,19,0),  tableNumber:3, waiter:"María",  cashier:"cajero2", guestCount:3, paymentMethod:"Transferencia",   tipMethod:"Efectivo",        subtotal:54.92, tax:8.79, discount:0,  tip:8.00,  total:71.71,  voided:false, notes:"", items:[{id:"i34",name:"Alitas de Pollo",category:"Entradas",qty:1,unitPrice:10.99},{id:"i35",name:"Hamburguesa Clásica",category:"Platos Principales",qty:3,unitPrice:12.99},{id:"i36",name:"Cerveza",category:"Bebidas",qty:3,unitPrice:4.99}] },
  { id: "T014", date: mkD(2,12,0),  tableNumber:5, waiter:"Carlos", cashier:"cajero1", guestCount:2, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:47.96, tax:7.67, discount:0,  tip:7.00,  total:62.63,  voided:false, notes:"", items:[{id:"i37",name:"Ensalada César",category:"Entradas",qty:2,unitPrice:9.99},{id:"i38",name:"Pasta Carbonara",category:"Platos Principales",qty:2,unitPrice:13.99}] },
  { id: "T015", date: mkD(2,14,30), tableNumber:3, waiter:"Juan",   cashier:"cajero1", guestCount:5, paymentMethod:"Tarjeta Débito",  tipMethod:"Tarjeta Débito",  subtotal:81.88, tax:13.10,discount:5,  tip:12.00, total:101.98, voided:false, notes:"", items:[{id:"i39",name:"Pizza Margarita",category:"Platos Principales",qty:3,unitPrice:14.99},{id:"i40",name:"Alitas de Pollo",category:"Entradas",qty:2,unitPrice:10.99},{id:"i41",name:"Coca Cola",category:"Bebidas",qty:5,unitPrice:2.99}] },
  { id: "T016", date: mkD(2,20,0),  tableNumber:7, waiter:"María",  cashier:"cajero2", guestCount:10,paymentMethod:"Tarjeta Crédito", tipMethod:"Tarjeta Crédito", subtotal:179.70,tax:28.75,discount:20, tip:35.00, total:223.45, voided:false, notes:"", items:[{id:"i42",name:"Hamburguesa Clásica",category:"Platos Principales",qty:5,unitPrice:12.99},{id:"i43",name:"Pizza Margarita",category:"Platos Principales",qty:3,unitPrice:14.99},{id:"i44",name:"Cerveza",category:"Bebidas",qty:10,unitPrice:4.99},{id:"i45",name:"Helado",category:"Postres",qty:5,unitPrice:5.99}] },
  { id: "T017", date: mkD(3,13,0),  tableNumber:2, waiter:"Carlos", cashier:"cajero1", guestCount:2, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:29.96, tax:4.79, discount:0,  tip:4.00,  total:38.75,  voided:false, notes:"", items:[{id:"i46",name:"Hamburguesa Clásica",category:"Platos Principales",qty:2,unitPrice:12.99},{id:"i47",name:"Agua Mineral",category:"Bebidas",qty:2,unitPrice:1.99}] },
  { id: "T018", date: mkD(3,15,30), tableNumber:6, waiter:"Juan",   cashier:"cajero2", guestCount:3, paymentMethod:"Tarjeta Débito",  tipMethod:"Tarjeta Débito",  subtotal:64.92, tax:10.39,discount:0,  tip:10.00, total:85.31,  voided:false, notes:"", items:[{id:"i48",name:"Alitas de Pollo",category:"Entradas",qty:1,unitPrice:10.99},{id:"i49",name:"Pasta Carbonara",category:"Platos Principales",qty:3,unitPrice:13.99},{id:"i50",name:"Tiramisú",category:"Postres",qty:2,unitPrice:6.99}] },
  { id: "T019", date: mkD(4,12,45), tableNumber:1, waiter:"María",  cashier:"cajero1", guestCount:2, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:41.95, tax:6.71, discount:0,  tip:6.00,  total:54.66,  voided:false, notes:"", items:[{id:"i51",name:"Ensalada César",category:"Entradas",qty:1,unitPrice:9.99},{id:"i52",name:"Hamburguesa Clásica",category:"Platos Principales",qty:2,unitPrice:12.99},{id:"i53",name:"Coca Cola",category:"Bebidas",qty:2,unitPrice:2.99}] },
  { id: "T020", date: mkD(4,18,0),  tableNumber:4, waiter:"Carlos", cashier:"cajero2", guestCount:4, paymentMethod:"Tarjeta Crédito", tipMethod:"Tarjeta Crédito", subtotal:83.86, tax:13.42,discount:0,  tip:15.00, total:112.28, voided:false, notes:"", items:[{id:"i54",name:"Pizza Margarita",category:"Platos Principales",qty:2,unitPrice:14.99},{id:"i55",name:"Alitas de Pollo",category:"Entradas",qty:2,unitPrice:10.99},{id:"i56",name:"Cerveza",category:"Bebidas",qty:4,unitPrice:4.99},{id:"i57",name:"Helado",category:"Postres",qty:2,unitPrice:5.99}] },
  { id: "T021", date: mkD(5,13,30), tableNumber:3, waiter:"Juan",   cashier:"cajero1", guestCount:3, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:47.94, tax:7.67, discount:0,  tip:7.00,  total:62.61,  voided:false, notes:"", items:[{id:"i58",name:"Hamburguesa Clásica",category:"Platos Principales",qty:3,unitPrice:12.99},{id:"i59",name:"Coca Cola",category:"Bebidas",qty:3,unitPrice:2.99}] },
  { id: "T022", date: mkD(5,16,0),  tableNumber:8, waiter:"María",  cashier:"cajero2", guestCount:6, paymentMethod:"Transferencia",   tipMethod:"Efectivo",        subtotal:124.86,tax:19.98,discount:10, tip:20.00, total:154.84, voided:false, notes:"", items:[{id:"i60",name:"Pizza Margarita",category:"Platos Principales",qty:3,unitPrice:14.99},{id:"i61",name:"Pasta Carbonara",category:"Platos Principales",qty:2,unitPrice:13.99},{id:"i62",name:"Cerveza",category:"Bebidas",qty:6,unitPrice:4.99},{id:"i63",name:"Tiramisú",category:"Postres",qty:3,unitPrice:6.99}] },
  { id: "T023", date: mkD(6,11,0),  tableNumber:5, waiter:"Carlos", cashier:"cajero1", guestCount:2, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:40.95, tax:6.55, discount:0,  tip:6.00,  total:53.50,  voided:false, notes:"", items:[{id:"i64",name:"Alitas de Pollo",category:"Entradas",qty:1,unitPrice:10.99},{id:"i65",name:"Hamburguesa Clásica",category:"Platos Principales",qty:2,unitPrice:12.99},{id:"i66",name:"Agua Mineral",category:"Bebidas",qty:2,unitPrice:1.99}] },
  { id: "T024", date: mkD(6,19,30), tableNumber:7, waiter:"Juan",   cashier:"cajero2", guestCount:8, paymentMethod:"Tarjeta Crédito", tipMethod:"Tarjeta Crédito", subtotal:165.76,tax:26.52,discount:15, tip:30.00, total:207.28, voided:false, notes:"", items:[{id:"i67",name:"Hamburguesa Clásica",category:"Platos Principales",qty:4,unitPrice:12.99},{id:"i68",name:"Pizza Margarita",category:"Platos Principales",qty:2,unitPrice:14.99},{id:"i69",name:"Alitas de Pollo",category:"Entradas",qty:2,unitPrice:10.99},{id:"i70",name:"Cerveza",category:"Bebidas",qty:8,unitPrice:4.99}] },
  { id: "T025", date: mkD(10,14,0), tableNumber:2, waiter:"María",  cashier:"cajero1", guestCount:2, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:41.96, tax:6.71, discount:0,  tip:6.00,  total:54.67,  voided:false, notes:"", items:[{id:"i71",name:"Pasta Carbonara",category:"Platos Principales",qty:2,unitPrice:13.99},{id:"i72",name:"Tiramisú",category:"Postres",qty:2,unitPrice:6.99}] },
  { id: "T026", date: mkD(12,13,0), tableNumber:4, waiter:"Carlos", cashier:"cajero2", guestCount:4, paymentMethod:"Tarjeta Débito",  tipMethod:"Tarjeta Débito",  subtotal:63.92, tax:10.23,discount:0,  tip:9.00,  total:83.15,  voided:false, notes:"", items:[{id:"i73",name:"Hamburguesa Clásica",category:"Platos Principales",qty:4,unitPrice:12.99},{id:"i74",name:"Coca Cola",category:"Bebidas",qty:4,unitPrice:2.99}] },
  { id: "T027", date: mkD(15,20,0), tableNumber:7, waiter:"Juan",   cashier:"cajero1", guestCount:10,paymentMethod:"Tarjeta Crédito", tipMethod:"Tarjeta Crédito", subtotal:199.75,tax:31.96,discount:20, tip:40.00, total:251.71, voided:false, notes:"", items:[{id:"i75",name:"Pizza Margarita",category:"Platos Principales",qty:5,unitPrice:14.99},{id:"i76",name:"Alitas de Pollo",category:"Entradas",qty:4,unitPrice:10.99},{id:"i77",name:"Cerveza",category:"Bebidas",qty:10,unitPrice:4.99},{id:"i78",name:"Helado",category:"Postres",qty:5,unitPrice:5.99}] },
  { id: "T028", date: mkD(20,12,0), tableNumber:1, waiter:"María",  cashier:"cajero2", guestCount:1, paymentMethod:"Efectivo",       tipMethod:"Efectivo",        subtotal:11.98, tax:1.92, discount:0,  tip:1.50,  total:15.40,  voided:false, notes:"", items:[{id:"i79",name:"Ensalada César",category:"Entradas",qty:1,unitPrice:9.99},{id:"i80",name:"Agua Mineral",category:"Bebidas",qty:1,unitPrice:1.99}] },
  { id: "T029", date: mkD(25,19,0), tableNumber:6, waiter:"Carlos", cashier:"cajero1", guestCount:6, paymentMethod:"Transferencia",   tipMethod:"Efectivo",        subtotal:99.84, tax:15.97,discount:5,  tip:15.00, total:125.81, voided:false, notes:"", items:[{id:"i81",name:"Hamburguesa Clásica",category:"Platos Principales",qty:3,unitPrice:12.99},{id:"i82",name:"Pizza Margarita",category:"Platos Principales",qty:2,unitPrice:14.99},{id:"i83",name:"Cerveza",category:"Bebidas",qty:6,unitPrice:4.99},{id:"i84",name:"Tiramisú",category:"Postres",qty:3,unitPrice:6.99}] },
  { id: "T030", date: mkD(28,15,30),tableNumber:3, waiter:"Juan",   cashier:"cajero2", guestCount:3, paymentMethod:"Tarjeta Débito",  tipMethod:"Tarjeta Débito",  subtotal:81.91, tax:13.11,discount:0,  tip:12.00, total:107.02, voided:false, notes:"", items:[{id:"i85",name:"Alitas de Pollo",category:"Entradas",qty:2,unitPrice:10.99},{id:"i86",name:"Pasta Carbonara",category:"Platos Principales",qty:3,unitPrice:13.99},{id:"i87",name:"Helado",category:"Postres",qty:3,unitPrice:5.99}] },
]

const defaultBusiness: BusinessConfig = {
  name: "Restaurante El Sabor",
  rfc: "RES010101AAA",
  address: "Calle Principal #123, Col. Centro",
  phone: "555-100-2000",
  email: "contacto@elsabor.mx",
  ticketHeader: "¡Gracias por su preferencia!",
  ticketFooter: "Propina no incluida. IVA incluido en precios.",
  currency: "MXN",
  timezone: "America/Mexico_City",
}

const defaultTax: TaxConfig = {
  ivaEnabled: true,
  ivaRate: 16,
  ivaIncluded: true,
  tipEnabled: true,
  tipSuggested: 10,
  tipAutoEnabled: false,
  tipAutoMinGuests: 8,
  tipAutoRate: 15,
  serviceChargeEnabled: false,
  serviceChargeRate: 5,
}

const ALL_MODULES: { value: AppModule; label: string }[] = [
  { value: "pos", label: "Punto de Venta" },
  { value: "kitchen", label: "Cocina" },
  { value: "billing", label: "Facturación" },
  { value: "inventory", label: "Inventario" },
  { value: "reports", label: "Reportes" },
  { value: "admin", label: "Administración" },
]

const TABLE_SECTIONS = ["Interior", "Terraza", "Barra", "Privado", "Jardín", "Lounge"]

// ─── Blank helpers ─────────────────────────────────────────────────────────────
const blankUser = (): Omit<AppUser, "id"> => ({ name: "", username: "", pin: "", role: "", modules: [], active: true, notes: "" })
const blankTable = (): Omit<TableDef, "id"> => ({ number: 0, capacity: 2, section: "Interior", active: true, notes: "" })
const blankMenuItem = (): Omit<MenuItem, "id"> => ({ categoryId: "", name: "", price: 0, description: "", available: true })
const blankCategory = (): Omit<MenuCategory, "id"> => ({ name: "", order: 99, active: true })

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ username: string; module: string } | null>(null)

  useEffect(() => {
    const sessionStr = localStorage.getItem("module_session_admin")
    if (!sessionStr) { router.push("/admin/login"); return }
    setUser(JSON.parse(sessionStr))
  }, [router])

  const logout = () => {
    localStorage.removeItem("module_session_admin")
    router.push("/admin/login")
  }

  // ── State ──────────────────────────────────────────────────────────────────
  const [appUsers, setAppUsers] = useState<AppUser[]>(seedUsers)
  const [tables, setTables] = useState<TableDef[]>(seedTables)
  const [categories, setCategories] = useState<MenuCategory[]>(seedCategories)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(seedMenuItems)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(seedPaymentMethods)
  const [business, setBusiness] = useState<BusinessConfig>(defaultBusiness)
  const [taxConfig, setTaxConfig] = useState<TaxConfig>(defaultTax)
  const [activeTab, setActiveTab] = useState("users")

  // ── User dialog ────────────────────────────────────────────────────────────
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [userForm, setUserForm] = useState(blankUser())
  const [showPin, setShowPin] = useState(false)

  const openNewUser = () => { setEditingUser(null); setUserForm(blankUser()); setShowPin(false); setShowUserDialog(true) }
  const openEditUser = (u: AppUser) => {
    setEditingUser(u)
    setUserForm({ name: u.name, username: u.username, pin: u.pin, role: u.role, modules: [...u.modules], active: u.active, notes: u.notes })
    setShowPin(false); setShowUserDialog(true)
  }
  const toggleUserModule = (mod: AppModule) => {
    setUserForm(p => ({
      ...p,
      modules: p.modules.includes(mod) ? p.modules.filter(m => m !== mod) : [...p.modules, mod],
    }))
  }
  const saveUser = () => {
    if (!userForm.name.trim()) { toast({ title: "El nombre es requerido" }); return }
    if (!userForm.username.trim()) { toast({ title: "El usuario es requerido" }); return }
    if (userForm.pin.length < 4) { toast({ title: "El PIN debe tener al menos 4 dígitos" }); return }
    if (editingUser) {
      setAppUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...userForm } : u))
      toast({ title: "Usuario actualizado" })
    } else {
      const duplicate = appUsers.find(u => u.username === userForm.username)
      if (duplicate) { toast({ title: "El nombre de usuario ya existe" }); return }
      setAppUsers(prev => [...prev, { id: `u-${Date.now()}`, ...userForm }])
      toast({ title: "Usuario creado" })
    }
    setShowUserDialog(false)
  }
  const deleteUser = (id: string) => {
    if (appUsers.length <= 1) { toast({ title: "Debe haber al menos un usuario" }); return }
    setAppUsers(prev => prev.filter(u => u.id !== id))
    toast({ title: "Usuario eliminado" })
  }

  // ── Table dialog ───────────────────────────────────────────────────────────
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [editingTable, setEditingTable] = useState<TableDef | null>(null)
  const [tableForm, setTableForm] = useState(blankTable())
  const [tableViewSection, setTableViewSection] = useState<string>("all")

  const openNewTable = () => { setEditingTable(null); setTableForm({ ...blankTable(), number: tables.length + 1 }); setShowTableDialog(true) }
  const openEditTable = (t: TableDef) => {
    setEditingTable(t)
    setTableForm({ number: t.number, capacity: t.capacity, section: t.section, active: t.active, notes: t.notes })
    setShowTableDialog(true)
  }
  const saveTable = () => {
    if (tableForm.number <= 0) { toast({ title: "El número de mesa debe ser mayor a 0" }); return }
    const dup = tables.find(t => t.number === tableForm.number && t.id !== editingTable?.id)
    if (dup) { toast({ title: `Ya existe la mesa ${tableForm.number}` }); return }
    if (editingTable) {
      setTables(prev => prev.map(t => t.id === editingTable.id ? { ...t, ...tableForm } : t))
      toast({ title: "Mesa actualizada" })
    } else {
      setTables(prev => [...prev, { id: `t-${Date.now()}`, ...tableForm }])
      toast({ title: "Mesa creada" })
    }
    setShowTableDialog(false)
  }
  const deleteTable = (id: string) => { setTables(prev => prev.filter(t => t.id !== id)); toast({ title: "Mesa eliminada" }) }
  const tableSections = Array.from(new Set(tables.map(t => t.section))).sort()

  // ── Menu dialogs ────────────────────────────────────────────────────────────
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState(blankCategory())
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null)

  const openNewCategory = () => { setEditingCategory(null); setCategoryForm({ ...blankCategory(), order: categories.length + 1 }); setShowCategoryDialog(true) }
  const openEditCategory = (c: MenuCategory) => {
    setEditingCategory(c); setCategoryForm({ name: c.name, order: c.order, active: c.active }); setShowCategoryDialog(true)
  }
  const saveCategory = () => {
    if (!categoryForm.name.trim()) { toast({ title: "El nombre es requerido" }); return }
    if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...categoryForm } : c))
      toast({ title: "Categoría actualizada" })
    } else {
      setCategories(prev => [...prev, { id: `c-${Date.now()}`, ...categoryForm }])
      toast({ title: "Categoría creada" })
    }
    setShowCategoryDialog(false)
  }
  const deleteCategory = (id: string) => {
    if (menuItems.some(i => i.categoryId === id)) { toast({ title: "Primero elimina o reasigna los platillos de esta categoría" }); return }
    setCategories(prev => prev.filter(c => c.id !== id)); toast({ title: "Categoría eliminada" })
  }

  const [showMenuItemDialog, setShowMenuItemDialog] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)
  const [menuItemForm, setMenuItemForm] = useState(blankMenuItem())

  const openNewMenuItem = (catId = "") => { setEditingMenuItem(null); setMenuItemForm({ ...blankMenuItem(), categoryId: catId }); setShowMenuItemDialog(true) }
  const openEditMenuItem = (m: MenuItem) => {
    setEditingMenuItem(m); setMenuItemForm({ categoryId: m.categoryId, name: m.name, price: m.price, description: m.description, available: m.available }); setShowMenuItemDialog(true)
  }
  const saveMenuItem = () => {
    if (!menuItemForm.name.trim()) { toast({ title: "El nombre es requerido" }); return }
    if (!menuItemForm.categoryId) { toast({ title: "Selecciona una categoría" }); return }
    if (editingMenuItem) {
      setMenuItems(prev => prev.map(m => m.id === editingMenuItem.id ? { ...m, ...menuItemForm } : m))
      toast({ title: "Platillo actualizado" })
    } else {
      setMenuItems(prev => [...prev, { id: `mi-${Date.now()}`, ...menuItemForm }])
      toast({ title: "Platillo creado" })
    }
    setShowMenuItemDialog(false)
  }
  const deleteMenuItem = (id: string) => { setMenuItems(prev => prev.filter(m => m.id !== id)); toast({ title: "Platillo eliminado" }) }

  // ── Payment methods ─────────────────────────────────────────────────────────
  const updatePaymentMethod = (id: string, field: keyof PaymentMethod, value: boolean | string) => {
    setPaymentMethods(prev => prev.map(pm => pm.id === id ? { ...pm, [field]: value } : pm))
  }
  const addPaymentMethod = () => {
    setPaymentMethods(prev => [...prev, { id: `pm-${Date.now()}`, name: "Nuevo método", active: true, requiresReference: false }])
  }

  // ── Comandas ────────────────────────────────────────────────────────────────
  const [tickets, setTickets] = useState<SaleTicket[]>(seedAdminTickets)
  const [cmdSearch, setCmdSearch] = useState("")
  const [cmdWaiter, setCmdWaiter] = useState("all")
  const [cmdMethod, setCmdMethod] = useState("all")
  const [cmdExpandId, setCmdExpandId] = useState<string | null>(null)
  const [showVoided, setShowVoided] = useState(false)

  // ── Edit ticket ─────────────────────────────────────────────────────────────
  const [editingTicket, setEditingTicket] = useState<SaleTicket | null>(null)
  const [showEditTicketDialog, setShowEditTicketDialog] = useState(false)
  const [ticketEditItems, setTicketEditItems] = useState<TicketItem[]>([])
  const [ticketEditPayMethod, setTicketEditPayMethod] = useState<TicketPaymentMethod>("Efectivo")
  const [ticketEditTip, setTicketEditTip] = useState(0)
  const [ticketEditTipMethod, setTicketEditTipMethod] = useState<TicketPaymentMethod>("Efectivo")
  const [ticketEditDiscount, setTicketEditDiscount] = useState(0)
  const [ticketEditNotes, setTicketEditNotes] = useState("")
  const [newItemMenuId, setNewItemMenuId] = useState("")
  const [newItemQty, setNewItemQty] = useState(1)

  // ── Delete PIN ──────────────────────────────────────────────────────────────
  const [showDeletePinDialog, setShowDeletePinDialog] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deletePinInput, setDeletePinInput] = useState("")
  const SUPERVISOR_PIN = "0000"

  // ── Comandas computed ────────────────────────────────────────────────────────
  const allTicketWaiters = useMemo(() => Array.from(new Set(tickets.map(t => t.waiter))).sort(), [tickets])
  const allTicketMethods: TicketPaymentMethod[] = ["Efectivo", "Tarjeta Débito", "Tarjeta Crédito", "Transferencia"]

  const filteredTickets = useMemo(() => {
    return [...tickets]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(t =>
        (showVoided || !t.voided) &&
        (cmdWaiter === "all" || t.waiter === cmdWaiter) &&
        (cmdMethod === "all" || t.paymentMethod === cmdMethod) &&
        (cmdSearch === "" || t.id.toLowerCase().includes(cmdSearch.toLowerCase()) || t.tableNumber.toString().includes(cmdSearch))
      )
  }, [tickets, cmdWaiter, cmdMethod, cmdSearch, showVoided])

  const recalcTicket = (items: TicketItem[], discount: number, tip: number) => {
    const subtotal = Math.round(items.reduce((s, i) => s + i.qty * i.unitPrice, 0) * 100) / 100
    const taxable = Math.max(subtotal - discount, 0)
    const tax = Math.round(taxable * 0.16 * 100) / 100
    const total = Math.round((taxable + tax + tip) * 100) / 100
    return { subtotal, tax, total }
  }

  const editTicketPreview = useMemo(() => recalcTicket(ticketEditItems, ticketEditDiscount, ticketEditTip), [ticketEditItems, ticketEditDiscount, ticketEditTip])

  const openEditTicket = (t: SaleTicket) => {
    setEditingTicket(t)
    setTicketEditItems(t.items.map(i => ({ ...i })))
    setTicketEditPayMethod(t.paymentMethod)
    setTicketEditTip(t.tip)
    setTicketEditTipMethod(t.tipMethod)
    setTicketEditDiscount(t.discount)
    setTicketEditNotes(t.notes)
    setNewItemMenuId("")
    setNewItemQty(1)
    setShowEditTicketDialog(true)
  }

  const saveEditTicket = () => {
    if (!editingTicket) return
    if (ticketEditItems.length === 0) { toast({ title: "La comanda debe tener al menos un ítem" }); return }
    const recalc = recalcTicket(ticketEditItems, ticketEditDiscount, ticketEditTip)
    setTickets(prev => prev.map(t => t.id === editingTicket.id ? {
      ...t, items: ticketEditItems, paymentMethod: ticketEditPayMethod,
      tip: ticketEditTip, tipMethod: ticketEditTipMethod,
      discount: ticketEditDiscount, notes: ticketEditNotes, ...recalc,
    } : t))
    toast({ title: "Comanda actualizada", description: editingTicket.id })
    setShowEditTicketDialog(false)
  }

  const addItemToEdit = () => {
    const menuItem = menuItems.find(m => m.id === newItemMenuId)
    if (!menuItem || newItemQty < 1) return
    const cat = categories.find(c => c.id === menuItem.categoryId)?.name ?? "Sin categoría"
    setTicketEditItems(prev => {
      const existing = prev.find(i => i.name === menuItem.name)
      if (existing) return prev.map(i => i.name === menuItem.name ? { ...i, qty: i.qty + newItemQty } : i)
      return [...prev, { id: `new-${Date.now()}`, name: menuItem.name, category: cat, qty: newItemQty, unitPrice: menuItem.price }]
    })
    setNewItemMenuId("")
    setNewItemQty(1)
  }

  const confirmDeleteTicket = (id: string) => { setDeleteTargetId(id); setDeletePinInput(""); setShowDeletePinDialog(true) }
  const voidTicket = (id: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, voided: true } : t))
    toast({ title: "Comanda anulada" })
  }

  const doDeleteTicket = () => {
    if (deletePinInput !== SUPERVISOR_PIN) { toast({ title: "PIN incorrecto", variant: "destructive" }); return }
    setTickets(prev => prev.filter(t => t.id !== deleteTargetId))
    toast({ title: "Comanda eliminada permanentemente", description: deleteTargetId ?? "" })
    setShowDeletePinDialog(false)
    setDeleteTargetId(null)
  }

  const toDateTimeStr = (iso: string) => new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>

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
                <h1 className="text-xl font-bold">Administración</h1>
                <p className="text-xs text-muted-foreground">{business.name} · {user.username}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1" />Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-1 hidden sm:inline" />Usuarios</TabsTrigger>
            <TabsTrigger value="tables"><LayoutGrid className="w-4 h-4 mr-1 hidden sm:inline" />Mesas</TabsTrigger>
            <TabsTrigger value="menu"><UtensilsCrossed className="w-4 h-4 mr-1 hidden sm:inline" />Menú</TabsTrigger>
            <TabsTrigger value="payments"><CreditCard className="w-4 h-4 mr-1 hidden sm:inline" />Pagos</TabsTrigger>
            <TabsTrigger value="taxes"><Percent className="w-4 h-4 mr-1 hidden sm:inline" />Impuestos</TabsTrigger>
            <TabsTrigger value="business"><Settings className="w-4 h-4 mr-1 hidden sm:inline" />Negocio</TabsTrigger>
            <TabsTrigger value="comandas"><Receipt className="w-4 h-4 mr-1 hidden sm:inline" />Comandas</TabsTrigger>
          </TabsList>

          {/* ══ USUARIOS ══ */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Usuarios del sistema</h2>
                <p className="text-xs text-muted-foreground">{appUsers.filter(u => u.active).length} activos de {appUsers.length}</p>
              </div>
              <Button size="sm" onClick={openNewUser}><Plus className="w-4 h-4 mr-1" />Nuevo usuario</Button>
            </div>
            <div className="space-y-3">
              {appUsers.map(u => (
                <Card key={u.id} className={`border-border ${!u.active ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-primary/10 w-9 h-9 flex items-center justify-center shrink-0 mt-0.5">
                          <Shield className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold">{u.name}</span>
                            <code className="text-xs text-muted-foreground bg-muted px-1 rounded">@{u.username}</code>
                            {!u.active && <Badge variant="outline" className="text-xs">Inactivo</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mb-1.5">
                            {u.role} · PIN: {"•".repeat(u.pin.length)}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {u.modules.map(mod => {
                              const label = ALL_MODULES.find(m => m.value === mod)?.label || mod
                              return <Badge key={mod} variant="secondary" className="text-xs">{label}</Badge>
                            })}
                            {u.modules.length === 0 && <span className="text-xs text-muted-foreground italic">Sin módulos asignados</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditUser(u)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteUser(u.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ══ MESAS ══ */}
          <TabsContent value="tables" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Mesas y salón</h2>
                <p className="text-xs text-muted-foreground">{tables.filter(t => t.active).length} mesas activas</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={tableViewSection} onValueChange={setTableViewSection}>
                  <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {tableSections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={openNewTable}><Plus className="w-4 h-4 mr-1" />Nueva mesa</Button>
              </div>
            </div>
            {(tableViewSection === "all" ? tableSections : [tableViewSection]).map(section => {
              const sectionTables = tables
                .filter(t => t.section === section)
                .sort((a, b) => a.number - b.number)
              if (sectionTables.length === 0) return null
              return (
                <div key={section}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{section}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {sectionTables.map(t => (
                      <Card key={t.id} className={`border-border cursor-pointer hover:border-primary/50 transition-colors ${!t.active ? "opacity-50" : ""}`}>
                        <CardContent className="p-3 text-center">
                          <div className="text-2xl font-bold text-primary mb-0.5">{t.number}</div>
                          <div className="text-xs text-muted-foreground mb-2">{t.capacity} personas</div>
                          {t.notes && <div className="text-xs italic text-muted-foreground mb-2 truncate">{t.notes}</div>}
                          <div className="flex justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditTable(t)}><Pencil className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteTable(t.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </TabsContent>

          {/* ══ MENÚ ══ */}
          <TabsContent value="menu" className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Menú del POS</h2>
                <p className="text-xs text-muted-foreground">{menuItems.filter(m => m.available).length} platillos disponibles</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="bg-transparent" onClick={openNewCategory}><Tag className="w-3.5 h-3.5 mr-1" />Nueva categoría</Button>
                <Button size="sm" onClick={() => openNewMenuItem()}><Plus className="w-4 h-4 mr-1" />Nuevo platillo</Button>
              </div>
            </div>
            {categories.sort((a, b) => a.order - b.order).map(cat => {
              const catItems = menuItems.filter(m => m.categoryId === cat.id)
              const isExpanded = expandedCategoryId === cat.id
              return (
                <Card key={cat.id} className={`border-border ${!cat.active ? "opacity-60" : ""}`}>
                  <CardContent className="p-0">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/40 transition-colors rounded-lg"
                      onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        <div>
                          <span className="font-semibold">{cat.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{catItems.length} platillos</span>
                          {!cat.active && <Badge variant="outline" className="text-xs ml-2">Inactiva</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openNewMenuItem(cat.id)}>
                          <Plus className="w-3 h-3 mr-1" />Platillo
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditCategory(cat)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteCategory(cat.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border divide-y divide-border/50">
                        {catItems.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-muted-foreground italic">Sin platillos en esta categoría</div>
                        ) : catItems.map(item => (
                          <div key={item.id} className={`flex items-center justify-between px-4 py-2.5 ${!item.available ? "opacity-50" : ""}`}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{item.name}</span>
                                {!item.available && <Badge variant="outline" className="text-xs">No disponible</Badge>}
                              </div>
                              {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <span className="font-semibold text-sm text-primary">${item.price.toFixed(2)}</span>
                              <Switch
                                checked={item.available}
                                onCheckedChange={v => setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, available: v } : m))}
                              />
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditMenuItem(item)}><Pencil className="w-3 h-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMenuItem(item.id)}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </TabsContent>

          {/* ══ MÉTODOS DE PAGO ══ */}
          <TabsContent value="payments" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Métodos de pago</h2>
                <p className="text-xs text-muted-foreground">{paymentMethods.filter(p => p.active).length} activos</p>
              </div>
              <Button size="sm" onClick={addPaymentMethod}><Plus className="w-4 h-4 mr-1" />Agregar método</Button>
            </div>
            <div className="space-y-2">
              {paymentMethods.map(pm => (
                <Card key={pm.id} className={`border-border transition-opacity ${!pm.active ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-muted w-9 h-9 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Input
                          value={pm.name}
                          onChange={e => updatePaymentMethod(pm.id, "name", e.target.value)}
                          className="h-7 text-sm border-0 bg-transparent p-0 font-semibold focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary rounded-none"
                        />
                        <div className="flex items-center gap-3 mt-1">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <Checkbox
                              checked={pm.requiresReference}
                              onCheckedChange={v => updatePaymentMethod(pm.id, "requiresReference", !!v)}
                              className="w-3 h-3"
                            />
                            Requiere referencia / número de aprobación
                          </label>
                        </div>
                      </div>
                      <Switch checked={pm.active} onCheckedChange={v => updatePaymentMethod(pm.id, "active", v)} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ══ IMPUESTOS Y PROPINA ══ */}
          <TabsContent value="taxes" className="space-y-4 max-w-xl">
            <div>
              <h2 className="text-base font-semibold">Impuestos y propina</h2>
              <p className="text-xs text-muted-foreground">Configuración de IVA, propina sugerida y cargos automáticos</p>
            </div>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Percent className="w-4 h-4" />IVA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Aplicar IVA</Label>
                  <Switch checked={taxConfig.ivaEnabled} onCheckedChange={v => setTaxConfig(p => ({ ...p, ivaEnabled: v }))} />
                </div>
                {taxConfig.ivaEnabled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Tasa de IVA (%)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number" min="0" max="100" step="1"
                            value={taxConfig.ivaRate}
                            onChange={e => setTaxConfig(p => ({ ...p, ivaRate: Number(e.target.value) }))}
                            className="h-8"
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">IVA incluido en los precios</Label>
                        <p className="text-xs text-muted-foreground">Los precios del menú ya incluyen IVA</p>
                      </div>
                      <Switch checked={taxConfig.ivaIncluded} onCheckedChange={v => setTaxConfig(p => ({ ...p, ivaIncluded: v }))} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />Propina
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Mostrar sugerencia de propina</Label>
                  <Switch checked={taxConfig.tipEnabled} onCheckedChange={v => setTaxConfig(p => ({ ...p, tipEnabled: v }))} />
                </div>
                {taxConfig.tipEnabled && (
                  <div className="space-y-1">
                    <Label className="text-xs">Propina sugerida (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min="0" max="100" step="1"
                        value={taxConfig.tipSuggested}
                        onChange={e => setTaxConfig(p => ({ ...p, tipSuggested: Number(e.target.value) }))}
                        className="h-8 w-28"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Propina automática para grupos</Label>
                    <p className="text-xs text-muted-foreground">Agregar propina obligatoria en mesas con muchas personas</p>
                  </div>
                  <Switch checked={taxConfig.tipAutoEnabled} onCheckedChange={v => setTaxConfig(p => ({ ...p, tipAutoEnabled: v }))} />
                </div>
                {taxConfig.tipAutoEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Mínimo de comensales</Label>
                      <Input
                        type="number" min="1"
                        value={taxConfig.tipAutoMinGuests}
                        onChange={e => setTaxConfig(p => ({ ...p, tipAutoMinGuests: Number(e.target.value) }))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tasa automática (%)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" min="0" max="100" step="1"
                          value={taxConfig.tipAutoRate}
                          onChange={e => setTaxConfig(p => ({ ...p, tipAutoRate: Number(e.target.value) }))}
                          className="h-8"
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4" />Cargo por servicio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Aplicar cargo por servicio</Label>
                    <p className="text-xs text-muted-foreground">Se agrega automáticamente a cada cuenta</p>
                  </div>
                  <Switch checked={taxConfig.serviceChargeEnabled} onCheckedChange={v => setTaxConfig(p => ({ ...p, serviceChargeEnabled: v }))} />
                </div>
                {taxConfig.serviceChargeEnabled && (
                  <div className="space-y-1">
                    <Label className="text-xs">Tasa del cargo (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min="0" max="100" step="1"
                        value={taxConfig.serviceChargeRate}
                        onChange={e => setTaxConfig(p => ({ ...p, serviceChargeRate: Number(e.target.value) }))}
                        className="h-8 w-28"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button onClick={() => toast({ title: "Configuración guardada" })} className="w-full">
              Guardar configuración
            </Button>
          </TabsContent>

          {/* ══ NEGOCIO ══ */}
          <TabsContent value="business" className="space-y-4 max-w-xl">
            <div>
              <h2 className="text-base font-semibold">Datos del negocio</h2>
              <p className="text-xs text-muted-foreground">Información que aparece en tickets y reportes</p>
            </div>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4" />Información general
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Nombre del establecimiento</Label>
                  <Input value={business.name} onChange={e => setBusiness(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>RFC</Label>
                    <Input value={business.rfc} onChange={e => setBusiness(p => ({ ...p, rfc: e.target.value }))} placeholder="RFC000101AAA" />
                  </div>
                  <div className="space-y-1">
                    <Label>Teléfono</Label>
                    <Input value={business.phone} onChange={e => setBusiness(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Dirección</Label>
                  <Input value={business.address} onChange={e => setBusiness(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Correo electrónico</Label>
                  <Input type="email" value={business.email} onChange={e => setBusiness(p => ({ ...p, email: e.target.value }))} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />Configuración del ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Mensaje al inicio del ticket</Label>
                  <Textarea value={business.ticketHeader} onChange={e => setBusiness(p => ({ ...p, ticketHeader: e.target.value }))} rows={2} placeholder="Bienvenido a..." />
                </div>
                <div className="space-y-1">
                  <Label>Mensaje al final del ticket</Label>
                  <Textarea value={business.ticketFooter} onChange={e => setBusiness(p => ({ ...p, ticketFooter: e.target.value }))} rows={2} placeholder="Gracias por su visita..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Moneda</Label>
                    <Select value={business.currency} onValueChange={v => setBusiness(p => ({ ...p, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MXN">MXN – Peso Mexicano</SelectItem>
                        <SelectItem value="USD">USD – Dólar Americano</SelectItem>
                        <SelectItem value="EUR">EUR – Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Zona horaria</Label>
                    <Select value={business.timezone} onValueChange={v => setBusiness(p => ({ ...p, timezone: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Mexico_City">Ciudad de México</SelectItem>
                        <SelectItem value="America/Cancun">Cancún</SelectItem>
                        <SelectItem value="America/Monterrey">Monterrey</SelectItem>
                        <SelectItem value="America/Tijuana">Tijuana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={() => toast({ title: "Configuración guardada" })} className="w-full">
              Guardar configuración
            </Button>
          </TabsContent>

          {/* ══ COMANDAS ══ */}
          <TabsContent value="comandas" className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Historial de comandas</h2>
              <p className="text-xs text-muted-foreground">Busca, edita o elimina tickets. La eliminación requiere PIN de supervisor.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-40 max-w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="# comanda o mesa..." className="pl-8 h-8 text-sm" value={cmdSearch} onChange={e => setCmdSearch(e.target.value)} />
              </div>
              <Select value={cmdWaiter} onValueChange={setCmdWaiter}>
                <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meseros</SelectItem>
                  {allTicketWaiters.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={cmdMethod} onValueChange={setCmdMethod}>
                <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los métodos</SelectItem>
                  {allTicketMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5 ml-auto">
                <Switch checked={showVoided} onCheckedChange={setShowVoided} id="sw-voided" />
                <Label htmlFor="sw-voided" className="text-xs cursor-pointer">Anuladas</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{filteredTickets.length} resultado(s) · Total: ${filteredTickets.filter(t => !t.voided).reduce((s,t) => s + t.total, 0).toFixed(2)}</p>

            <ScrollArea className="max-h-[65vh]">
              <div className="space-y-2 pr-1">
                {filteredTickets.length === 0
                  ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Sin resultados</p>
                    </div>
                  )
                  : filteredTickets.map(t => {
                    const isExpanded = cmdExpandId === t.id
                    return (
                      <Card key={t.id} className={`border-border transition-opacity ${t.voided ? "opacity-50" : ""}`}>
                        <CardContent className="p-0">
                          {/* Row */}
                          <div
                            className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/40 rounded-lg"
                            onClick={() => setCmdExpandId(isExpanded ? null : t.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                                <code className="text-xs font-bold">{t.id}</code>
                                <Badge variant="outline" className="text-xs h-4">Mesa {t.tableNumber}</Badge>
                                <span className="text-xs text-muted-foreground">{t.waiter}</span>
                                <Badge variant={t.paymentMethod === "Efectivo" ? "default" : "secondary"} className="text-xs h-4">{t.paymentMethod}</Badge>
                                {t.voided && <Badge variant="destructive" className="text-xs h-4">Anulada</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {toDateTimeStr(t.date)} · {t.items.reduce((s,i) => s+i.qty,0)} art.
                                {t.tip > 0 && <span className="text-yellow-500 ml-1">· Prop: ${t.tip.toFixed(2)}</span>}
                                {t.discount > 0 && <span className="text-destructive ml-1">· Desc: -${t.discount.toFixed(2)}</span>}
                                {t.notes && <span className="ml-1 italic">· {t.notes}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-base font-bold text-primary">${t.total.toFixed(2)}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </div>

                          {/* Expanded */}
                          {isExpanded && (
                            <div className="border-t border-border px-4 pb-3 pt-2">
                              <div className="space-y-1 mb-3">
                                {t.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{item.qty}× {item.name}</span>
                                    <span>${(item.unitPrice * item.qty).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                              <Separator className="mb-2" />
                              <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground mb-3">
                                <span>Subtotal: ${t.subtotal.toFixed(2)}</span>
                                <span>IVA: ${t.tax.toFixed(2)}</span>
                                {t.discount > 0 && <span className="text-destructive">Descuento: -${t.discount.toFixed(2)}</span>}
                                {t.tip > 0 && <span className="text-yellow-500">Propina ({t.tipMethod}): ${t.tip.toFixed(2)}</span>}
                                <span className="font-semibold text-foreground col-span-2">Total: ${t.total.toFixed(2)}</span>
                              </div>
                              {/* Actions */}
                              {!t.voided && (
                                <div className="flex gap-2 flex-wrap">
                                  <Button size="sm" variant="outline" className="h-7 bg-transparent text-xs gap-1"
                                    onClick={e => { e.stopPropagation(); openEditTicket(t) }}>
                                    <Pencil className="w-3 h-3" />Editar comanda
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 bg-transparent text-xs gap-1 text-yellow-600 border-yellow-600/30 hover:bg-yellow-500/10"
                                    onClick={e => { e.stopPropagation(); voidTicket(t.id) }}>
                                    <FileX className="w-3 h-3" />Anular
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 bg-transparent text-xs gap-1"
                                    onClick={e => { e.stopPropagation(); toast({ title: "Reimprimiendo", description: t.id }) }}>
                                    <Printer className="w-3 h-3" />Reimprimir
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-7 text-xs gap-1 ml-auto"
                                    onClick={e => { e.stopPropagation(); confirmDeleteTicket(t.id) }}>
                                    <Trash2 className="w-3 h-3" />Eliminar
                                  </Button>
                                </div>
                              )}
                              {t.voided && (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="h-7 bg-transparent text-xs gap-1"
                                    onClick={e => { e.stopPropagation(); setTickets(prev => prev.map(x => x.id === t.id ? { ...x, voided: false } : x)); toast({ title: "Comanda restaurada" }) }}>
                                    Restaurar comanda
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-7 text-xs gap-1 ml-auto"
                                    onClick={e => { e.stopPropagation(); confirmDeleteTicket(t.id) }}>
                                    <Trash2 className="w-3 h-3" />Eliminar permanente
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })
                }
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* ══ DIALOGS ══ */}

      {/* User */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
            <DialogDescription>
              {editingUser ? `Modificando: ${editingUser.name}` : "Crea una cuenta para acceder a los módulos del sistema."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre completo *</Label>
                <Input value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Juan Pérez" />
              </div>
              <div className="space-y-1">
                <Label>Usuario *</Label>
                <Input value={userForm.username} onChange={e => setUserForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, "") }))} placeholder="juan" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>PIN (4+ dígitos) *</Label>
                <div className="relative">
                  <Input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={8}
                    value={userForm.pin}
                    onChange={e => setUserForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, "") }))}
                    placeholder="••••"
                    className="pr-8"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPin(v => !v)}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Rol / Puesto</Label>
                <Input value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))} placeholder="Cajero, Mesero, Cocinero..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Módulos con acceso</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3">
                {ALL_MODULES.map(mod => (
                  <label key={mod.value} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <Checkbox
                      checked={userForm.modules.includes(mod.value)}
                      onCheckedChange={() => toggleUserModule(mod.value)}
                    />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input value={userForm.notes} onChange={e => setUserForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones opcionales" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={userForm.active} onCheckedChange={v => setUserForm(p => ({ ...p, active: v }))} />
              <Label>Cuenta activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancelar</Button>
            <Button onClick={saveUser}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingTable ? `Mesa ${editingTable.number}` : "Nueva mesa"}</DialogTitle>
            <DialogDescription>{editingTable ? "Modifica los datos de la mesa." : "Agrega una mesa al salón."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Número de mesa *</Label>
                <Input type="number" min="1" value={tableForm.number} onChange={e => setTableForm(p => ({ ...p, number: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Capacidad (personas)</Label>
                <Input type="number" min="1" value={tableForm.capacity} onChange={e => setTableForm(p => ({ ...p, capacity: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Área / Sector</Label>
              <Select value={tableForm.section} onValueChange={v => setTableForm(p => ({ ...p, section: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TABLE_SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Input value={tableForm.notes} onChange={e => setTableForm(p => ({ ...p, notes: e.target.value }))} placeholder="Mesa familiar, junto a ventana..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={tableForm.active} onCheckedChange={v => setTableForm(p => ({ ...p, active: v }))} />
              <Label>Mesa activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>Cancelar</Button>
            <Button onClick={saveTable}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>Las categorías organizan el menú en el POS.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={categoryForm.name} onChange={e => setCategoryForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Entradas, Bebidas..." />
            </div>
            <div className="space-y-1">
              <Label>Orden de aparición</Label>
              <Input type="number" min="1" value={categoryForm.order} onChange={e => setCategoryForm(p => ({ ...p, order: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={categoryForm.active} onCheckedChange={v => setCategoryForm(p => ({ ...p, active: v }))} />
              <Label>Categoría activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancelar</Button>
            <Button onClick={saveCategory}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Ticket Dialog ── */}
      <Dialog open={showEditTicketDialog} onOpenChange={setShowEditTicketDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar comanda {editingTicket?.id}</DialogTitle>
            <DialogDescription>Mesa {editingTicket?.tableNumber} · {editingTicket?.waiter} · {editingTicket ? toDateTimeStr(editingTicket.date) : ""}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="space-y-4 pr-2">
              {/* Items table */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ítems de la comanda</Label>
                <div className="mt-2 space-y-1.5">
                  {ticketEditItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">${item.unitPrice.toFixed(2)} c/u · {item.category}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="h-6 w-6 bg-transparent"
                          onClick={() => setTicketEditItems(prev => prev.map((i,j) => j === idx ? { ...i, qty: Math.max(1, i.qty - 1) } : i))}>
                          <span className="text-xs font-bold">−</span>
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                        <Button size="icon" variant="outline" className="h-6 w-6 bg-transparent"
                          onClick={() => setTicketEditItems(prev => prev.map((i,j) => j === idx ? { ...i, qty: i.qty + 1 } : i))}>
                          <span className="text-xs font-bold">+</span>
                        </Button>
                      </div>
                      <div className="text-sm font-semibold w-14 text-right">${(item.unitPrice * item.qty).toFixed(2)}</div>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => setTicketEditItems(prev => prev.filter((_,j) => j !== idx))}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add item */}
              <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agregar ítem del menú</Label>
                <div className="flex gap-2">
                  <Select value={newItemMenuId} onValueChange={setNewItemMenuId}>
                    <SelectTrigger className="flex-1 h-8"><SelectValue placeholder="Seleccionar platillo..." /></SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.active).map(cat => (
                        <div key={cat.id}>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">{cat.name}</div>
                          {menuItems.filter(mi => mi.categoryId === cat.id && mi.available).map(mi => (
                            <SelectItem key={mi.id} value={mi.id}>{mi.name} — ${mi.price.toFixed(2)}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min={1} value={newItemQty} onChange={e => setNewItemQty(Math.max(1, Number(e.target.value)))} className="h-8 w-14 text-center" />
                  <Button size="sm" className="h-8" onClick={addItemToEdit} disabled={!newItemMenuId}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Payment, tip, discount */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Método de pago</Label>
                  <Select value={ticketEditPayMethod} onValueChange={v => setTicketEditPayMethod(v as TicketPaymentMethod)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Efectivo","Tarjeta Débito","Tarjeta Crédito","Transferencia"] as TicketPaymentMethod[]).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descuento ($)</Label>
                  <Input type="number" step="0.01" min="0" className="h-8" value={ticketEditDiscount}
                    onChange={e => setTicketEditDiscount(Math.max(0, Number(e.target.value)))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Propina ($)</Label>
                  <Input type="number" step="0.01" min="0" className="h-8" value={ticketEditTip}
                    onChange={e => setTicketEditTip(Math.max(0, Number(e.target.value)))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Método propina</Label>
                  <Select value={ticketEditTipMethod} onValueChange={v => setTicketEditTipMethod(v as TicketPaymentMethod)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Efectivo","Tarjeta Débito","Tarjeta Crédito","Transferencia"] as TicketPaymentMethod[]).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Notas internas</Label>
                <Input placeholder="Corrección de pedido, error de caja..." value={ticketEditNotes} onChange={e => setTicketEditNotes(e.target.value)} className="h-8" />
              </div>

              {/* Live preview */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${editTicketPreview.subtotal.toFixed(2)}</span></div>
                {ticketEditDiscount > 0 && <div className="flex justify-between text-destructive"><span>Descuento</span><span>-${ticketEditDiscount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-muted-foreground"><span>IVA (16%)</span><span>${editTicketPreview.tax.toFixed(2)}</span></div>
                {ticketEditTip > 0 && <div className="flex justify-between text-yellow-500"><span>Propina</span><span>${ticketEditTip.toFixed(2)}</span></div>}
                <Separator />
                <div className="flex justify-between font-bold text-primary"><span>Total</span><span>${editTicketPreview.total.toFixed(2)}</span></div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowEditTicketDialog(false)}>Cancelar</Button>
            <Button onClick={saveEditTicket}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete PIN Dialog ── */}
      <Dialog open={showDeletePinDialog} onOpenChange={setShowDeletePinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />Eliminar comanda</DialogTitle>
            <DialogDescription>
              Esta acción es permanente. Ingresa el PIN de supervisor para confirmar la eliminación de <strong>{deleteTargetId}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>PIN de supervisor</Label>
            <Input
              type="password" inputMode="numeric" maxLength={10} placeholder="••••"
              value={deletePinInput} onChange={e => setDeletePinInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") doDeleteTicket() }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeletePinDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={doDeleteTicket}><Trash2 className="w-4 h-4 mr-1" />Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu item */}
      <Dialog open={showMenuItemDialog} onOpenChange={setShowMenuItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMenuItem ? "Editar platillo" : "Nuevo platillo"}</DialogTitle>
            <DialogDescription>{editingMenuItem ? `Modificando: ${editingMenuItem.name}` : "Agrega un platillo al menú del POS."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={menuItemForm.name} onChange={e => setMenuItemForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del platillo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoría *</Label>
                <Select value={menuItemForm.categoryId} onValueChange={v => setMenuItemForm(p => ({ ...p, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.active).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Precio ($)</Label>
                <Input type="number" step="0.01" min="0" value={menuItemForm.price} onChange={e => setMenuItemForm(p => ({ ...p, price: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea value={menuItemForm.description} onChange={e => setMenuItemForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Ingredientes, notas de preparación..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={menuItemForm.available} onCheckedChange={v => setMenuItemForm(p => ({ ...p, available: v }))} />
              <Label>Disponible en el POS</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMenuItemDialog(false)}>Cancelar</Button>
            <Button onClick={saveMenuItem}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
