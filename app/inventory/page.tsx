"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Package,
  Users,
  BookOpen,
  UtensilsCrossed,
  ArrowUpDown,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Search,
  LogOut,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShoppingCart,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

// ─── Types ────────────────────────────────────────────────────────────────────

type UnitOfMeasure = "kg" | "g" | "lt" | "ml" | "pz" | "caja" | "bolsa" | "lata"

interface Supplier {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  notes: string
  active: boolean
}

interface Ingredient {
  id: string
  name: string
  category: string
  unit: UnitOfMeasure
  stock: number
  minStock: number
  costPerUnit: number
  supplierId: string
  notes: string
  active: boolean
}

interface MenuItemDef {
  id: string
  name: string
  category: string
  salePrice: number
  active: boolean
  notes: string
}

interface RecipeLine {
  ingredientId: string
  quantity: number
}

interface Recipe {
  id: string
  menuItemId: string
  lines: RecipeLine[]
  notes: string
}

type MovementType = "entrada" | "salida" | "merma" | "ajuste"

interface StockMovement {
  id: string
  date: string
  type: MovementType
  ingredientId: string
  quantity: number
  reason: string
  userId: string
  costPerUnit?: number
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const seedSuppliers: Supplier[] = [
  { id: "s1", name: "Carnes Selectas SA", contact: "Juan Pérez", phone: "555-1001", email: "juan@carne.mx", notes: "Entrega lunes y jueves", active: true },
  { id: "s2", name: "Lácteos Del Valle", contact: "María López", phone: "555-2002", email: "maria@lacteos.mx", notes: "", active: true },
  { id: "s3", name: "Verduras Frescas MX", contact: "Carlos Ruiz", phone: "555-3003", email: "carlos@verduras.mx", notes: "Solo pago contado", active: true },
  { id: "s4", name: "Distribuidora Bebidas", contact: "Rosa Torres", phone: "555-4004", email: "rosa@bebidas.mx", notes: "", active: true },
]

const seedIngredients: Ingredient[] = [
  { id: "i1", name: "Carne molida", category: "Carnes", unit: "kg", stock: 8, minStock: 5, costPerUnit: 120, supplierId: "s1", notes: "", active: true },
  { id: "i2", name: "Pan de hamburguesa", category: "Panadería", unit: "pz", stock: 60, minStock: 20, costPerUnit: 4.5, supplierId: "s3", notes: "", active: true },
  { id: "i3", name: "Queso amarillo", category: "Lácteos", unit: "kg", stock: 2, minStock: 3, costPerUnit: 90, supplierId: "s2", notes: "", active: true },
  { id: "i4", name: "Lechuga", category: "Verduras", unit: "kg", stock: 3, minStock: 2, costPerUnit: 18, supplierId: "s3", notes: "", active: true },
  { id: "i5", name: "Jitomate", category: "Verduras", unit: "kg", stock: 4, minStock: 2, costPerUnit: 22, supplierId: "s3", notes: "", active: true },
  { id: "i6", name: "Masa para pizza", category: "Panadería", unit: "pz", stock: 15, minStock: 8, costPerUnit: 25, supplierId: "s3", notes: "", active: true },
  { id: "i7", name: "Salsa de tomate", category: "Condimentos", unit: "lt", stock: 5, minStock: 3, costPerUnit: 35, supplierId: "s3", notes: "", active: true },
  { id: "i8", name: "Pechuga de pollo", category: "Carnes", unit: "kg", stock: 6, minStock: 4, costPerUnit: 95, supplierId: "s1", notes: "", active: true },
  { id: "i9", name: "Alitas de pollo", category: "Carnes", unit: "kg", stock: 7, minStock: 5, costPerUnit: 80, supplierId: "s1", notes: "", active: true },
  { id: "i10", name: "Coca Cola 600ml", category: "Bebidas", unit: "pz", stock: 48, minStock: 20, costPerUnit: 12, supplierId: "s4", notes: "", active: true },
  { id: "i11", name: "Agua mineral", category: "Bebidas", unit: "pz", stock: 36, minStock: 15, costPerUnit: 8, supplierId: "s4", notes: "", active: true },
  { id: "i12", name: "Cerveza 355ml", category: "Bebidas", unit: "pz", stock: 60, minStock: 24, costPerUnit: 18, supplierId: "s4", notes: "", active: true },
  { id: "i13", name: "Mezcla p/ tiramisú", category: "Postres", unit: "kg", stock: 4, minStock: 2, costPerUnit: 55, supplierId: "s2", notes: "", active: true },
  { id: "i14", name: "Helado (cubo 4lt)", category: "Postres", unit: "pz", stock: 3, minStock: 2, costPerUnit: 120, supplierId: "s2", notes: "", active: true },
  { id: "i15", name: "Tocino", category: "Carnes", unit: "kg", stock: 2, minStock: 1, costPerUnit: 110, supplierId: "s1", notes: "", active: true },
]

const seedMenuItems: MenuItemDef[] = [
  { id: "m1", name: "Hamburguesa Clásica", category: "Platos Principales", salePrice: 12.99, active: true, notes: "" },
  { id: "m2", name: "Pizza Margarita", category: "Platos Principales", salePrice: 14.99, active: true, notes: "" },
  { id: "m3", name: "Ensalada César", category: "Entradas", salePrice: 9.99, active: true, notes: "" },
  { id: "m4", name: "Pasta Carbonara", category: "Platos Principales", salePrice: 13.99, active: true, notes: "" },
  { id: "m5", name: "Alitas de Pollo", category: "Entradas", salePrice: 10.99, active: true, notes: "" },
  { id: "m6", name: "Coca Cola", category: "Bebidas", salePrice: 2.99, active: true, notes: "" },
  { id: "m7", name: "Agua Mineral", category: "Bebidas", salePrice: 1.99, active: true, notes: "" },
  { id: "m8", name: "Cerveza", category: "Bebidas", salePrice: 4.99, active: true, notes: "" },
  { id: "m9", name: "Tiramisú", category: "Postres", salePrice: 6.99, active: true, notes: "" },
  { id: "m10", name: "Helado", category: "Postres", salePrice: 5.99, active: true, notes: "" },
]

const seedRecipes: Recipe[] = [
  { id: "r1", menuItemId: "m1", lines: [{ ingredientId: "i2", quantity: 1 }, { ingredientId: "i1", quantity: 0.15 }, { ingredientId: "i4", quantity: 0.03 }, { ingredientId: "i5", quantity: 0.05 }], notes: "" },
  { id: "r2", menuItemId: "m2", lines: [{ ingredientId: "i6", quantity: 1 }, { ingredientId: "i7", quantity: 0.1 }, { ingredientId: "i3", quantity: 0.08 }], notes: "" },
  { id: "r3", menuItemId: "m3", lines: [{ ingredientId: "i4", quantity: 0.08 }, { ingredientId: "i8", quantity: 0.12 }], notes: "" },
  { id: "r5", menuItemId: "m5", lines: [{ ingredientId: "i9", quantity: 0.25 }], notes: "" },
  { id: "r6", menuItemId: "m6", lines: [{ ingredientId: "i10", quantity: 1 }], notes: "" },
  { id: "r7", menuItemId: "m7", lines: [{ ingredientId: "i11", quantity: 1 }], notes: "" },
  { id: "r8", menuItemId: "m8", lines: [{ ingredientId: "i12", quantity: 1 }], notes: "" },
  { id: "r9", menuItemId: "m9", lines: [{ ingredientId: "i13", quantity: 0.12 }], notes: "" },
  { id: "r10", menuItemId: "m10", lines: [{ ingredientId: "i14", quantity: 0.25 }], notes: "" },
]

const ingredientCategories = ["Carnes", "Lácteos", "Verduras", "Panadería", "Condimentos", "Bebidas", "Postres", "Otros"]
const menuCategories = ["Platos Principales", "Entradas", "Bebidas", "Postres", "Otros"]
const units: UnitOfMeasure[] = ["kg", "g", "lt", "ml", "pz", "caja", "bolsa", "lata"]
const movementTypes: { value: MovementType; label: string }[] = [
  { value: "entrada", label: "Entrada de mercancía" },
  { value: "salida", label: "Salida manual" },
  { value: "merma", label: "Merma / Desperdicio" },
  { value: "ajuste", label: "Ajuste de inventario" },
]

// ─── Blank helpers ─────────────────────────────────────────────────────────────
const blankSupplier = (): Omit<Supplier, "id"> => ({ name: "", contact: "", phone: "", email: "", notes: "", active: true })
const blankIngredient = (): Omit<Ingredient, "id"> => ({ name: "", category: "Carnes", unit: "kg", stock: 0, minStock: 0, costPerUnit: 0, supplierId: "", notes: "", active: true })
const blankMenuItem = (): Omit<MenuItemDef, "id"> => ({ name: "", category: "Platos Principales", salePrice: 0, active: true, notes: "" })

// ─── Component ────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ username: string; module: string } | null>(null)

  useEffect(() => {
    const sessionStr = localStorage.getItem("module_session_inventory")
    if (!sessionStr) { router.push("/inventory/login"); return }
    setUser(JSON.parse(sessionStr))
  }, [router])

  const logout = () => {
    localStorage.removeItem("module_session_inventory")
    router.push("/inventory/login")
  }

  // ── State ──────────────────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<Supplier[]>(seedSuppliers)
  const [ingredients, setIngredients] = useState<Ingredient[]>(seedIngredients)
  const [menuItems, setMenuItems] = useState<MenuItemDef[]>(seedMenuItems)
  const [recipes, setRecipes] = useState<Recipe[]>(seedRecipes)
  const [movements, setMovements] = useState<StockMovement[]>([])

  const [activeTab, setActiveTab] = useState("dashboard")
  const [search, setSearch] = useState("")

  // ── Supplier dialog ────────────────────────────────────────────────────────
  const [showSupplierDialog, setShowSupplierDialog] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState(blankSupplier())

  const openNewSupplier = () => { setEditingSupplier(null); setSupplierForm(blankSupplier()); setShowSupplierDialog(true) }
  const openEditSupplier = (s: Supplier) => { setEditingSupplier(s); setSupplierForm({ name: s.name, contact: s.contact, phone: s.phone, email: s.email, notes: s.notes, active: s.active }); setShowSupplierDialog(true) }
  const saveSupplier = () => {
    if (!supplierForm.name.trim()) { toast({ title: "El nombre es requerido" }); return }
    if (editingSupplier) {
      setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...supplierForm } : s))
      toast({ title: "Proveedor actualizado" })
    } else {
      setSuppliers(prev => [...prev, { id: `s-${Date.now()}`, ...supplierForm }])
      toast({ title: "Proveedor creado" })
    }
    setShowSupplierDialog(false)
  }
  const deleteSupplier = (id: string) => { setSuppliers(prev => prev.filter(s => s.id !== id)); toast({ title: "Proveedor eliminado" }) }

  // ── Ingredient dialog ──────────────────────────────────────────────────────
  const [showIngredientDialog, setShowIngredientDialog] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const [ingredientForm, setIngredientForm] = useState(blankIngredient())

  const openNewIngredient = () => { setEditingIngredient(null); setIngredientForm(blankIngredient()); setShowIngredientDialog(true) }
  const openEditIngredient = (i: Ingredient) => {
    setEditingIngredient(i)
    setIngredientForm({ name: i.name, category: i.category, unit: i.unit, stock: i.stock, minStock: i.minStock, costPerUnit: i.costPerUnit, supplierId: i.supplierId, notes: i.notes, active: i.active })
    setShowIngredientDialog(true)
  }
  const saveIngredient = () => {
    if (!ingredientForm.name.trim()) { toast({ title: "El nombre es requerido" }); return }
    if (editingIngredient) {
      setIngredients(prev => prev.map(i => i.id === editingIngredient.id ? { ...i, ...ingredientForm } : i))
      toast({ title: "Insumo actualizado" })
    } else {
      setIngredients(prev => [...prev, { id: `i-${Date.now()}`, ...ingredientForm }])
      toast({ title: "Insumo creado" })
    }
    setShowIngredientDialog(false)
  }
  const deleteIngredient = (id: string) => { setIngredients(prev => prev.filter(i => i.id !== id)); toast({ title: "Insumo eliminado" }) }

  // ── Menu item dialog ───────────────────────────────────────────────────────
  const [showMenuDialog, setShowMenuDialog] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItemDef | null>(null)
  const [menuForm, setMenuForm] = useState(blankMenuItem())

  const openNewMenuItem = () => { setEditingMenuItem(null); setMenuForm(blankMenuItem()); setShowMenuDialog(true) }
  const openEditMenuItem = (m: MenuItemDef) => {
    setEditingMenuItem(m)
    setMenuForm({ name: m.name, category: m.category, salePrice: m.salePrice, active: m.active, notes: m.notes })
    setShowMenuDialog(true)
  }
  const saveMenuItem = () => {
    if (!menuForm.name.trim()) { toast({ title: "El nombre es requerido" }); return }
    if (editingMenuItem) {
      setMenuItems(prev => prev.map(m => m.id === editingMenuItem.id ? { ...m, ...menuForm } : m))
      toast({ title: "Platillo actualizado" })
    } else {
      setMenuItems(prev => [...prev, { id: `m-${Date.now()}`, ...menuForm }])
      toast({ title: "Platillo creado" })
    }
    setShowMenuDialog(false)
  }
  const deleteMenuItem = (id: string) => {
    setMenuItems(prev => prev.filter(m => m.id !== id))
    setRecipes(prev => prev.filter(r => r.menuItemId !== id))
    toast({ title: "Platillo eliminado", description: "La receta asociada también fue eliminada." })
  }

  // ── Recipe dialog ──────────────────────────────────────────────────────────
  const [showRecipeDialog, setShowRecipeDialog] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [recipeMenuItemId, setRecipeMenuItemId] = useState("")
  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>([])
  const [recipeNotes, setRecipeNotes] = useState("")
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null)

  const openRecipeForItem = (menuItemId: string) => {
    const existing = recipes.find(r => r.menuItemId === menuItemId)
    setRecipeMenuItemId(menuItemId)
    setEditingRecipe(existing || null)
    setRecipeLines(existing ? existing.lines.map(l => ({ ...l })) : [])
    setRecipeNotes(existing?.notes || "")
    setShowRecipeDialog(true)
  }
  const addRecipeLine = () => setRecipeLines(prev => [...prev, { ingredientId: "", quantity: 0 }])
  const removeRecipeLine = (idx: number) => setRecipeLines(prev => prev.filter((_, i) => i !== idx))
  const updateRecipeLine = (idx: number, field: keyof RecipeLine, value: string | number) => {
    setRecipeLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: field === "quantity" ? Number(value) : value } : l))
  }
  const saveRecipe = () => {
    const validLines = recipeLines.filter(l => l.ingredientId && l.quantity > 0)
    if (validLines.length === 0) { toast({ title: "Agrega al menos un insumo con cantidad" }); return }
    const recipe: Recipe = { id: editingRecipe?.id || `r-${Date.now()}`, menuItemId: recipeMenuItemId, lines: validLines, notes: recipeNotes }
    if (editingRecipe) {
      setRecipes(prev => prev.map(r => r.id === editingRecipe.id ? recipe : r))
      toast({ title: "Receta actualizada" })
    } else {
      setRecipes(prev => [...prev, recipe])
      toast({ title: "Receta creada" })
    }
    setShowRecipeDialog(false)
  }
  const deleteRecipe = (id: string) => { setRecipes(prev => prev.filter(r => r.id !== id)); toast({ title: "Receta eliminada" }) }

  // ── Movement dialog ────────────────────────────────────────────────────────
  const [showMovementDialog, setShowMovementDialog] = useState(false)
  const [movementForm, setMovementForm] = useState<{ type: MovementType; ingredientId: string; quantity: number; reason: string; costPerUnit: number }>({
    type: "entrada", ingredientId: "", quantity: 0, reason: "", costPerUnit: 0,
  })

  const openMovement = (type: MovementType = "entrada", ingredientId = "") => {
    const ing = ingredients.find(i => i.id === ingredientId)
    setMovementForm({ type, ingredientId, quantity: 0, reason: "", costPerUnit: ing?.costPerUnit || 0 })
    setShowMovementDialog(true)
  }
  const saveMovement = () => {
    if (!movementForm.ingredientId) { toast({ title: "Seleccione un insumo" }); return }
    if (movementForm.quantity <= 0) { toast({ title: "La cantidad debe ser mayor a 0" }); return }
    if (!movementForm.reason.trim()) { toast({ title: "Ingrese motivo o descripción" }); return }
    const move: StockMovement = {
      id: `mv-${Date.now()}`,
      date: new Date().toISOString(),
      type: movementForm.type,
      ingredientId: movementForm.ingredientId,
      quantity: movementForm.quantity,
      reason: movementForm.reason,
      userId: user?.username || "sistema",
      costPerUnit: movementForm.type === "entrada" ? movementForm.costPerUnit : undefined,
    }
    setMovements(prev => [move, ...prev])
    setIngredients(prev => prev.map(ing => {
      if (ing.id !== movementForm.ingredientId) return ing
      let delta = 0
      if (movementForm.type === "entrada") delta = movementForm.quantity
      else if (movementForm.type === "ajuste") delta = movementForm.quantity - ing.stock
      else delta = -movementForm.quantity
      const newCost = movementForm.type === "entrada" && movementForm.costPerUnit > 0 ? movementForm.costPerUnit : ing.costPerUnit
      return { ...ing, stock: Math.max(0, ing.stock + delta), costPerUnit: newCost }
    }))
    toast({ title: "Movimiento registrado" })
    setShowMovementDialog(false)
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const lowStockIngredients = useMemo(() => ingredients.filter(i => i.active && i.stock <= i.minStock), [ingredients])

  const recipeCost = (menuItemId: string): number => {
    const recipe = recipes.find(r => r.menuItemId === menuItemId)
    if (!recipe) return 0
    return recipe.lines.reduce((sum, line) => {
      const ing = ingredients.find(i => i.id === line.ingredientId)
      return sum + (ing ? ing.costPerUnit * line.quantity : 0)
    }, 0)
  }

  const canMakePortions = (menuItemId: string): number => {
    const recipe = recipes.find(r => r.menuItemId === menuItemId)
    if (!recipe || recipe.lines.length === 0) return Infinity
    return Math.floor(Math.min(...recipe.lines.map(line => {
      const ing = ingredients.find(i => i.id === line.ingredientId)
      if (!ing || line.quantity <= 0) return Infinity
      return ing.stock / line.quantity
    })))
  }

  const totalInventoryValue = useMemo(() => ingredients.reduce((sum, i) => sum + i.stock * i.costPerUnit, 0), [ingredients])

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Inventario</h1>
                <p className="text-xs text-muted-foreground">Usuario: {user.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lowStockIngredients.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {lowStockIngredients.length} alertas
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-1" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setSearch("") }}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="dashboard"><Package className="w-4 h-4 mr-1 hidden sm:inline" />Resumen</TabsTrigger>
            <TabsTrigger value="ingredients"><ShoppingCart className="w-4 h-4 mr-1 hidden sm:inline" />Insumos</TabsTrigger>
            <TabsTrigger value="suppliers"><Users className="w-4 h-4 mr-1 hidden sm:inline" />Proveedores</TabsTrigger>
            <TabsTrigger value="menu"><UtensilsCrossed className="w-4 h-4 mr-1 hidden sm:inline" />Platillos</TabsTrigger>
            <TabsTrigger value="recipes"><BookOpen className="w-4 h-4 mr-1 hidden sm:inline" />Recetas</TabsTrigger>
            <TabsTrigger value="movements"><ArrowUpDown className="w-4 h-4 mr-1 hidden sm:inline" />Movimientos</TabsTrigger>
          </TabsList>

          {/* ══ DASHBOARD ══ */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Insumos activos</div>
                    <div className="text-2xl font-bold">{ingredients.filter(i => i.active).length}</div>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 p-2 mt-0.5 shrink-0">
                    <ShoppingCart className="w-5 h-5 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Valor del inventario</div>
                    <div className="text-2xl font-bold text-primary">${totalInventoryValue.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-green-500/10 p-2 mt-0.5 shrink-0">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Platillos activos</div>
                    <div className="text-2xl font-bold">{menuItems.filter(m => m.active).length}</div>
                  </div>
                  <div className="rounded-lg bg-purple-500/10 p-2 mt-0.5 shrink-0">
                    <UtensilsCrossed className="w-5 h-5 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className={`border-border ${lowStockIngredients.length > 0 ? "border-destructive bg-destructive/5" : ""}`}>
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Alertas de stock</div>
                    <div className={`text-2xl font-bold ${lowStockIngredients.length > 0 ? "text-destructive" : ""}`}>{lowStockIngredients.length}</div>
                  </div>
                  <div className={`rounded-lg p-2 mt-0.5 shrink-0 ${lowStockIngredients.length > 0 ? "bg-destructive/10" : "bg-muted"}`}>
                    <AlertTriangle className={`w-5 h-5 ${lowStockIngredients.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {lowStockIngredients.length > 0 && (
              <Card className="border-destructive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    Insumos con stock bajo o agotado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lowStockIngredients.map(ing => {
                      const supplier = suppliers.find(s => s.id === ing.supplierId)
                      return (
                        <div key={ing.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <div>
                            <div className="font-medium text-sm">{ing.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Stock: <span className="font-bold text-destructive">{ing.stock} {ing.unit}</span>
                              {" "}· Mínimo: {ing.minStock} {ing.unit}
                              {supplier ? <span> · {supplier.name}</span> : null}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="bg-transparent" onClick={() => openMovement("entrada", ing.id)}>
                            <TrendingUp className="w-3 h-3 mr-1" />Entrada
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Disponibilidad de platillos</CardTitle>
                <CardDescription>Porciones posibles según inventario actual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {menuItems.filter(m => m.active).map(m => {
                    const portions = canMakePortions(m.id)
                    const hasRecipe = recipes.some(r => r.menuItemId === m.id)
                    const cost = recipeCost(m.id)
                    const margin = m.salePrice > 0 && cost > 0 ? ((m.salePrice - cost) / m.salePrice) * 100 : null
                    const status = !hasRecipe ? "sin-receta" : portions === 0 ? "agotado" : portions <= 5 ? "bajo" : "ok"
                    return (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded border border-border">
                        <div>
                          <div className="text-sm font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Costo: ${cost.toFixed(2)}{margin !== null ? ` · Margen: ${margin.toFixed(1)}%` : ""}
                          </div>
                        </div>
                        <Badge variant={status === "ok" ? "default" : status === "agotado" ? "destructive" : status === "bajo" ? "secondary" : "outline"} className="text-xs">
                          {status === "sin-receta" ? "Sin receta" : status === "agotado" ? "Agotado" : `${portions === Infinity ? "∞" : portions} porciones`}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ INSUMOS ══ */}
          <TabsContent value="ingredients" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar insumo..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="bg-transparent" onClick={() => openMovement("entrada")}>
                  <TrendingUp className="w-4 h-4 mr-1" />Entrada rápida
                </Button>
                <Button size="sm" onClick={openNewIngredient}>
                  <Plus className="w-4 h-4 mr-1" />Nuevo insumo
                </Button>
              </div>
            </div>
            {ingredientCategories.map(cat => {
              const list = ingredients.filter(i => i.category === cat && i.name.toLowerCase().includes(search.toLowerCase()))
              if (list.length === 0) return null
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{cat}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-2">
                    {list.map(ing => {
                      const supplier = suppliers.find(s => s.id === ing.supplierId)
                      const isLow = ing.stock <= ing.minStock
                      return (
                        <Card key={ing.id} className={`border-border ${isLow ? "border-l-4 border-l-destructive" : ""}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{ing.name}</span>
                                  {!ing.active && <Badge variant="outline" className="text-xs">Inactivo</Badge>}
                                  {isLow && <Badge variant="destructive" className="text-xs">Stock bajo</Badge>}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                                  <span>Stock: <strong className={isLow ? "text-destructive" : "text-foreground"}>{ing.stock} {ing.unit}</strong></span>
                                  <span>Mínimo: {ing.minStock} {ing.unit}</span>
                                  <span>Costo: ${ing.costPerUnit.toFixed(2)}/{ing.unit}</span>
                                  <span>Proveedor: {supplier?.name || <em>Sin asignar</em>}</span>
                                </div>
                                {ing.notes && <div className="text-xs text-muted-foreground mt-1 italic">{ing.notes}</div>}
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Entrada" onClick={() => openMovement("entrada", ing.id)}><TrendingUp className="w-3.5 h-3.5 text-green-500" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Merma" onClick={() => openMovement("merma", ing.id)}><TrendingDown className="w-3.5 h-3.5 text-yellow-500" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Ajuste" onClick={() => openMovement("ajuste", ing.id)}><RefreshCw className="w-3.5 h-3.5 text-blue-500" /></Button>
                                <Separator orientation="vertical" className="h-4 mx-0.5" />
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditIngredient(ing)}><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteIngredient(ing.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </TabsContent>

          {/* ══ PROVEEDORES ══ */}
          <TabsContent value="suppliers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar proveedor..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button size="sm" onClick={openNewSupplier}><Plus className="w-4 h-4 mr-1" />Nuevo proveedor</Button>
            </div>
            <div className="space-y-3">
              {suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.contact.toLowerCase().includes(search.toLowerCase())).map(s => {
                const myIngredients = ingredients.filter(i => i.supplierId === s.id)
                return (
                  <Card key={s.id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{s.name}</span>
                            {!s.active && <Badge variant="outline" className="text-xs">Inactivo</Badge>}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                            {s.contact && <span>Contacto: {s.contact}</span>}
                            {s.phone && <span>Tel: {s.phone}</span>}
                            {s.email && <span>Email: {s.email}</span>}
                          </div>
                          {s.notes && <div className="text-xs italic text-muted-foreground mt-1">{s.notes}</div>}
                          {myIngredients.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {myIngredients.map(i => <Badge key={i.id} variant="secondary" className="text-xs">{i.name}</Badge>)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditSupplier(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteSupplier(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* ══ PLATILLOS ══ */}
          <TabsContent value="menu" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar platillo..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button size="sm" onClick={openNewMenuItem}><Plus className="w-4 h-4 mr-1" />Nuevo platillo</Button>
            </div>
            {menuCategories.map(cat => {
              const list = menuItems.filter(m => m.category === cat && m.name.toLowerCase().includes(search.toLowerCase()))
              if (list.length === 0) return null
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{cat}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-2">
                    {list.map(m => {
                      const hasRecipe = recipes.some(r => r.menuItemId === m.id)
                      const cost = recipeCost(m.id)
                      const margin = m.salePrice > 0 && cost > 0 ? ((m.salePrice - cost) / m.salePrice) * 100 : null
                      const portions = canMakePortions(m.id)
                      return (
                        <Card key={m.id} className={`border-border ${!m.active ? "opacity-60" : ""}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{m.name}</span>
                                  <Badge variant={m.active ? "default" : "outline"} className="text-xs">{m.active ? "Activo" : "86 – Inactivo"}</Badge>
                                  {hasRecipe && portions === 0 && <Badge variant="destructive" className="text-xs">Sin stock</Badge>}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 text-xs text-muted-foreground">
                                  <span>Precio: <strong className="text-foreground">${m.salePrice.toFixed(2)}</strong></span>
                                  <span>Costo receta: ${cost.toFixed(2)}</span>
                                  {margin !== null && <span>Margen: <strong className={margin < 30 ? "text-destructive" : "text-green-500"}>{margin.toFixed(1)}%</strong></span>}
                                  <span>Porciones: {portions === Infinity ? "∞" : portions}</span>
                                </div>
                                {m.notes && <div className="text-xs italic text-muted-foreground mt-1">{m.notes}</div>}
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs font-bold"
                                  onClick={() => setMenuItems(prev => prev.map(x => x.id === m.id ? { ...x, active: !x.active } : x))}
                                  title={m.active ? "Desactivar (86)" : "Activar"}>
                                  {m.active ? "86" : "ON"}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Receta" onClick={() => openRecipeForItem(m.id)}><BookOpen className="w-3.5 h-3.5 text-blue-500" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditMenuItem(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMenuItem(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </TabsContent>

          {/* ══ RECETAS ══ */}
          <TabsContent value="recipes" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {recipes.length} recetas · {menuItems.filter(m => !recipes.some(r => r.menuItemId === m.id)).length} platillos sin receta
              </p>
            </div>
            <div className="space-y-2">
              {menuItems.map(m => {
                const recipe = recipes.find(r => r.menuItemId === m.id)
                const cost = recipeCost(m.id)
                const isExpanded = expandedRecipeId === m.id
                return (
                  <Card key={m.id} className="border-border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedRecipeId(isExpanded ? null : m.id)}>
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          <div>
                            <div className="font-medium text-sm">{m.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {recipe
                                ? `${recipe.lines.length} insumo(s) · Costo: $${cost.toFixed(2)} · Margen: ${m.salePrice > 0 ? (((m.salePrice - cost) / m.salePrice) * 100).toFixed(1) : "—"}%`
                                : "Sin receta"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!recipe && <Badge variant="outline" className="text-xs text-muted-foreground">Sin receta</Badge>}
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={e => { e.stopPropagation(); openRecipeForItem(m.id) }}>
                            {recipe ? <><Pencil className="w-3 h-3 mr-1" />Editar</> : <><Plus className="w-3 h-3 mr-1" />Crear</>}
                          </Button>
                          {recipe && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={e => { e.stopPropagation(); deleteRecipe(recipe.id) }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {isExpanded && recipe && (
                        <div className="mt-3 pl-7 border-t border-border pt-3 space-y-1">
                          {recipe.lines.map((line, idx) => {
                            const ing = ingredients.find(i => i.id === line.ingredientId)
                            if (!ing) return null
                            return (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span>{ing.name}</span>
                                  <span className="text-xs text-muted-foreground">{line.quantity} {ing.unit}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">${(ing.costPerUnit * line.quantity).toFixed(2)}</span>
                              </div>
                            )
                          })}
                          <Separator className="my-1" />
                          <div className="flex justify-between text-sm font-semibold">
                            <span>Costo total</span><span>${cost.toFixed(2)}</span>
                          </div>
                          {recipe.notes && <div className="text-xs italic text-muted-foreground">{recipe.notes}</div>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* ══ MOVIMIENTOS ══ */}
          <TabsContent value="movements" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{movements.length} movimientos registrados en esta sesión</p>
              <Button size="sm" onClick={() => openMovement()}><Plus className="w-4 h-4 mr-1" />Nuevo movimiento</Button>
            </div>
            {movements.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ArrowUpDown className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No hay movimientos registrados aún</p>
                <p className="text-xs mt-1">Registra una entrada de mercancía para comenzar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {movements.map(mv => {
                  const ing = ingredients.find(i => i.id === mv.ingredientId)
                  const typeColor: Record<MovementType, string> = { entrada: "text-green-500", salida: "text-orange-500", merma: "text-yellow-500", ajuste: "text-blue-500" }
                  const typeLabel: Record<MovementType, string> = { entrada: "Entrada", salida: "Salida", merma: "Merma", ajuste: "Ajuste" }
                  return (
                    <Card key={mv.id} className="border-border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge variant="outline" className={`text-xs ${typeColor[mv.type]}`}>{typeLabel[mv.type]}</Badge>
                              <span className="font-medium text-sm">{ing?.name || "Insumo eliminado"}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {mv.quantity} {ing?.unit} · {mv.reason} · {mv.userId}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            <div>{new Date(mv.date).toLocaleString()}</div>
                            {mv.type === "entrada" && mv.costPerUnit ? <div>Costo: ${mv.costPerUnit.toFixed(2)}/{ing?.unit}</div> : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ══ DIALOGS ══ */}

      {/* Supplier */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
            <DialogDescription>
              {editingSupplier ? `Modificando: ${editingSupplier.name}` : "Completa los datos del proveedor para registrarlo en el sistema."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del proveedor" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Contacto</Label>
                <Input value={supplierForm.contact} onChange={e => setSupplierForm(p => ({ ...p, contact: e.target.value }))} placeholder="Nombre del contacto" />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input value={supplierForm.phone} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))} placeholder="555-0000" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={supplierForm.email} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} placeholder="correo@proveedor.com" />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={supplierForm.notes} onChange={e => setSupplierForm(p => ({ ...p, notes: e.target.value }))} placeholder="Días de entrega, condiciones de pago..." rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={supplierForm.active} onCheckedChange={v => setSupplierForm(p => ({ ...p, active: v }))} />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierDialog(false)}>Cancelar</Button>
            <Button onClick={saveSupplier}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ingredient */}
      <Dialog open={showIngredientDialog} onOpenChange={setShowIngredientDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIngredient ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
            <DialogDescription>
              {editingIngredient ? `Modificando: ${editingIngredient.name}` : "Completa los datos del insumo a registrar en el inventario."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={ingredientForm.name} onChange={e => setIngredientForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del insumo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoría</Label>
                <Select value={ingredientForm.category} onValueChange={v => setIngredientForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ingredientCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Unidad de medida</Label>
                <Select value={ingredientForm.unit} onValueChange={v => setIngredientForm(p => ({ ...p, unit: v as UnitOfMeasure }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Stock actual</Label>
                <Input type="number" step="0.01" min="0" value={ingredientForm.stock} onChange={e => setIngredientForm(p => ({ ...p, stock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Stock mínimo</Label>
                <Input type="number" step="0.01" min="0" value={ingredientForm.minStock} onChange={e => setIngredientForm(p => ({ ...p, minStock: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Costo/unidad ($)</Label>
                <Input type="number" step="0.01" min="0" value={ingredientForm.costPerUnit} onChange={e => setIngredientForm(p => ({ ...p, costPerUnit: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Proveedor</Label>
              <Select
                value={ingredientForm.supplierId || "none"}
                onValueChange={v => setIngredientForm(p => ({ ...p, supplierId: v === "none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {suppliers.filter(s => s.active).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={ingredientForm.notes} onChange={e => setIngredientForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={ingredientForm.active} onCheckedChange={v => setIngredientForm(p => ({ ...p, active: v }))} />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIngredientDialog(false)}>Cancelar</Button>
            <Button onClick={saveIngredient}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu item */}
      <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMenuItem ? "Editar platillo" : "Nuevo platillo"}</DialogTitle>
            <DialogDescription>
              {editingMenuItem ? `Modificando: ${editingMenuItem.name}` : "Registra un nuevo platillo del menú con su precio de venta."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={menuForm.name} onChange={e => setMenuForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del platillo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoría</Label>
                <Select value={menuForm.category} onValueChange={v => setMenuForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{menuCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Precio de venta ($)</Label>
                <Input type="number" step="0.01" min="0" value={menuForm.salePrice} onChange={e => setMenuForm(p => ({ ...p, salePrice: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={menuForm.notes} onChange={e => setMenuForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={menuForm.active} onCheckedChange={v => setMenuForm(p => ({ ...p, active: v }))} />
              <Label>Disponible en el POS</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMenuDialog(false)}>Cancelar</Button>
            <Button onClick={saveMenuItem}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recipe */}
      <Dialog open={showRecipeDialog} onOpenChange={setShowRecipeDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Receta: {menuItems.find(m => m.id === recipeMenuItemId)?.name}</DialogTitle>
            <DialogDescription>Insumos necesarios para preparar 1 porción</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-2 pr-2">
              {recipeLines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={line.ingredientId} onValueChange={v => updateRecipeLine(idx, "ingredientId", v)}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Insumo" /></SelectTrigger>
                      <SelectContent>
                        {ingredients.filter(i => i.active).map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Input type="number" step="0.001" min="0" className="h-8 text-sm" placeholder="Cant."
                      value={line.quantity} onChange={e => updateRecipeLine(idx, "quantity", e.target.value)} />
                  </div>
                  <div className="text-xs text-muted-foreground w-16 text-right">
                    {(() => { const ing = ingredients.find(i => i.id === line.ingredientId); return ing ? `$${(ing.costPerUnit * line.quantity).toFixed(2)}` : "" })()}
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeRecipeLine(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-full bg-transparent" onClick={addRecipeLine}>
                <Plus className="w-4 h-4 mr-1" /> Agregar insumo
              </Button>
              <Separator />
              <div className="flex justify-between text-sm font-semibold px-1">
                <span>Costo total de la receta</span>
                <span className="text-primary">
                  ${recipeLines.reduce((sum, l) => { const ing = ingredients.find(i => i.id === l.ingredientId); return sum + (ing ? ing.costPerUnit * l.quantity : 0) }, 0).toFixed(2)}
                </span>
              </div>
              <div className="space-y-1 px-1">
                <Label className="text-xs">Notas de preparación</Label>
                <Textarea value={recipeNotes} onChange={e => setRecipeNotes(e.target.value)} rows={2} placeholder="Instrucciones, tiempo de cocción, etc." />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecipeDialog(false)}>Cancelar</Button>
            <Button onClick={saveRecipe}>Guardar receta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar movimiento de stock</DialogTitle>
            <DialogDescription>Actualiza el inventario de un insumo</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tipo de movimiento</Label>
              <div className="grid grid-cols-2 gap-2">
                {movementTypes.map(mt => {
                  const isActive = movementForm.type === mt.value
                  const icons = {
                    entrada: <TrendingUp className="w-3.5 h-3.5" />,
                    salida: <ArrowUpDown className="w-3.5 h-3.5" />,
                    merma: <TrendingDown className="w-3.5 h-3.5" />,
                    ajuste: <RefreshCw className="w-3.5 h-3.5" />,
                  }
                  return (
                    <Button key={mt.value} size="sm"
                      variant={isActive ? "default" : "outline"}
                      className={`justify-start gap-2 ${!isActive ? "bg-transparent" : ""}`}
                      onClick={() => setMovementForm(p => ({ ...p, type: mt.value }))}
                    >
                      {icons[mt.value]}
                      {mt.label}
                    </Button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Insumo *</Label>
              <Select value={movementForm.ingredientId} onValueChange={v => {
                const ing = ingredients.find(i => i.id === v)
                setMovementForm(p => ({ ...p, ingredientId: v, costPerUnit: ing?.costPerUnit || 0 }))
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar insumo" /></SelectTrigger>
                <SelectContent>
                  {ingredients.filter(i => i.active).map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.name} (Stock: {i.stock} {i.unit})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{movementForm.type === "ajuste" ? "Nuevo stock total" : "Cantidad"}</Label>
                <Input type="number" step="0.01" min="0" value={movementForm.quantity} onChange={e => setMovementForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
                {movementForm.type === "ajuste" && movementForm.ingredientId && (
                  <div className="text-xs text-muted-foreground">
                    Actual: {ingredients.find(i => i.id === movementForm.ingredientId)?.stock ?? "—"} · Diferencia: {(movementForm.quantity - (ingredients.find(i => i.id === movementForm.ingredientId)?.stock ?? 0)).toFixed(2)}
                  </div>
                )}
              </div>
              {movementForm.type === "entrada" && (
                <div className="space-y-1">
                  <Label>Costo por unidad ($)</Label>
                  <Input type="number" step="0.01" min="0" value={movementForm.costPerUnit} onChange={e => setMovementForm(p => ({ ...p, costPerUnit: Number(e.target.value) }))} />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Motivo / descripción *</Label>
              <Input value={movementForm.reason} onChange={e => setMovementForm(p => ({ ...p, reason: e.target.value }))}
                placeholder={
                  movementForm.type === "entrada" ? "Ej: Compra semanal, Proveedor X" :
                  movementForm.type === "merma" ? "Ej: Producto vencido, derrame" :
                  movementForm.type === "ajuste" ? "Ej: Conteo físico" : "Ej: Consumo interno"
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMovementDialog(false)}>Cancelar</Button>
            <Button onClick={saveMovement}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
