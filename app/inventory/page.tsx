"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getSession, clearSession, getActiveEstablecimiento, setActiveEstablecimiento, clearActiveEstablecimiento, type AuthUser,
  insumos, recetas, platillos as platillosApi, movimientos, establecimientos as establecimientosApi,
  type Insumo, type ModificadorGrupo, type Establecimiento,
} from "@/lib/api"
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

type UnitOfMeasure = string

interface Ingredient {
  id: string
  name: string
  category: string
  unit: UnitOfMeasure
  stock: number
  minStock: number
  costPerUnit: number
  proveedor: string
  notes: string
  active: boolean
}

interface MenuItemDef {
  id: string
  name: string
  category: string
  categoryId?: string
  salePrice: number
  active: boolean
  notes: string
  modifiers: ModificadorGrupo[]
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

interface ModifierAvailability {
  groupName: string
  optionName: string
  ingredientName: string
  unit: string
  stock: number
  quantity: number
  portions: number
}

interface DishAvailability {
  hasRecipe: boolean
  recipePortions: number
  modifierDetails: ModifierAvailability[]
  modifierTotal: number
  portions: number
  source: "recipe" | "modifiers" | "mixed" | "none"
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

const INVENTORY_MOVEMENTS_KEY = "inventory_movements_v1"

const mapApiMovement = (m: {
  id: number
  registradoEn: string
  tipo: string
  insumoId: string
  cantidad: number
  motivo: string
  usuarioId?: string | null
  costoPorUnidad?: number | null
}): StockMovement => ({
  id: String(m.id),
  date: m.registradoEn,
  type: m.tipo as MovementType,
  ingredientId: m.insumoId,
  quantity: m.cantidad,
  reason: m.motivo,
  userId: m.usuarioId ?? "sistema",
  costPerUnit: m.costoPorUnidad ?? undefined,
})

const loadStoredMovements = (): StockMovement[] => {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(INVENTORY_MOVEMENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StockMovement[]) : []
  } catch {
    return []
  }
}

const saveStoredMovements = (list: StockMovement[]) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(INVENTORY_MOVEMENTS_KEY, JSON.stringify(list.slice(0, 400)))
  } catch {
    // Ignore storage errors to avoid blocking inventory workflow.
  }
}

// ─── Unit helpers ──────────────────────────────────────────────────────────────
const toApiUnit = (u: UnitOfMeasure): Insumo["unidad"] => {
  if (u === "lt") return "L"
  if (u === "ml") return "mL"
  if (u === "pz") return "pza"
  return u.trim() || "pza"
}
const fromApiUnit = (u: string): UnitOfMeasure => {
  if (u === "L") return "lt"
  if (u === "mL") return "ml"
  if (u === "pza") return "pz"
  return u
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const seedIngredients: Ingredient[] = [
  { id: "i1", name: "Carne molida", category: "Carnes", unit: "kg", stock: 8, minStock: 5, costPerUnit: 120, proveedor: "", notes: "", active: true },
  { id: "i2", name: "Pan de hamburguesa", category: "Panadería", unit: "pz", stock: 60, minStock: 20, costPerUnit: 4.5, proveedor: "", notes: "", active: true },
  { id: "i3", name: "Queso amarillo", category: "Lácteos", unit: "kg", stock: 2, minStock: 3, costPerUnit: 90, proveedor: "", notes: "", active: true },
]

const seedMenuItems: MenuItemDef[] = ([
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
] as Omit<MenuItemDef, "modifiers">[]).map(item => ({ ...item, modifiers: [] }))

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
const blankIngredient = (): Omit<Ingredient, "id"> => ({ name: "", category: "Carnes", unit: "kg", stock: 0, minStock: 0, costPerUnit: 0, proveedor: "", notes: "", active: true })
const blankMenuItem = (): Omit<MenuItemDef, "id"> => ({ name: "", category: "Platos Principales", salePrice: 0, active: true, notes: "", modifiers: [] })

// ─── Component ────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [branches, setBranches] = useState<Establecimiento[]>([])
  const [activeBranchId, setActiveBranchId] = useState("")
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [menuItems, setMenuItems] = useState<MenuItemDef[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])

  const refreshMovements = () => {
    const storedMovements = loadStoredMovements()
    if (storedMovements.length) setMovements(storedMovements)

    movimientos.getAll({ limit: 200 }, "inventory").then(list => {
      const apiMapped = list.map(mapApiMovement)
      const apiIds = new Set(apiMapped.map(m => m.id))
      const merged = [...apiMapped, ...storedMovements.filter(m => !apiIds.has(m.id))]
      setMovements(merged)
      saveStoredMovements(merged)
    }).catch(() => {
      setMovements(storedMovements)
    })
  }

  useEffect(() => {
    const session = getSession("inventory")
    if (!session) { router.push("/inventory/login"); return }
    setUser(session.user)
    setActiveBranchId(getActiveEstablecimiento("inventory") || "")
  }, [router])

  useEffect(() => {
    if (!user) return
    establecimientosApi.getAll("inventory")
      .then(list => {
        setBranches(list)
        if (!getActiveEstablecimiento("inventory") && list[0]?.id) {
          setActiveEstablecimiento("inventory", list[0].id)
          setActiveBranchId(list[0].id)
        }
      })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) return

    insumos.getAll("inventory").then(list =>
      setIngredients(list.map(i => ({
        id: i.id,
        name: i.nombre,
        category: i.categoriaNombre ?? "Otros",
        unit: fromApiUnit(i.unidad),
        stock: i.stockActual,
        minStock: i.stockMinimo,
        costPerUnit: i.costoUnitario,
        proveedor: i.proveedor ?? "",
        notes: "",
        active: i.activo,
      })))
    ).catch(e => toast({ title: "Error al cargar insumos", description: String(e), variant: "destructive" }))

    platillosApi.getAll("inventory").then(list =>
      setMenuItems(list.map(p => ({
        id: p.id,
        name: p.nombre,
        category: p.categoriaNombre ?? "",
        categoryId: p.categoriaId,
        salePrice: p.precio,
        active: p.disponible,
        notes: "",
        modifiers: p.modificadores ?? [],
      })))
    ).catch(e => toast({ title: "Error al cargar platillos", description: String(e), variant: "destructive" }))

    recetas.getAll("inventory").then(list =>
      setRecipes(list.map(r => ({
        id: r.platilloId,
        menuItemId: r.platilloId,
        lines: r.ingredientes.map(i => ({ ingredientId: i.insumoId, quantity: i.cantidad })),
        notes: "",
      })))
    ).catch(e => toast({ title: "Error al cargar recetas", description: String(e), variant: "destructive" }))

    refreshMovements()
  }, [user, activeBranchId])

  const changeBranch = (branchId: string) => {
    setActiveEstablecimiento("inventory", branchId)
    setActiveBranchId(branchId)
    setSearch("")
    toast({ title: "Sucursal cambiada" })
  }

  const logout = () => {
    clearSession("inventory")
    clearActiveEstablecimiento("inventory")
    router.push("/inventory/login")
  }

  const [activeTab, setActiveTab] = useState("dashboard")
  const [search, setSearch] = useState("")

  // ── Ingredient dialog ──────────────────────────────────────────────────────
  const [showIngredientDialog, setShowIngredientDialog] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const [ingredientForm, setIngredientForm] = useState(blankIngredient())

  const openNewIngredient = () => { setEditingIngredient(null); setIngredientForm(blankIngredient()); setShowIngredientDialog(true) }
  const openEditIngredient = (i: Ingredient) => {
    setEditingIngredient(i)
    setIngredientForm({ name: i.name, category: i.category, unit: i.unit, stock: i.stock, minStock: i.minStock, costPerUnit: i.costPerUnit, proveedor: i.proveedor, notes: i.notes, active: i.active })
    setShowIngredientDialog(true)
  }
  const saveIngredient = () => {
    if (!ingredientForm.name.trim()) { toast({ title: "El nombre es requerido" }); return }
    if (editingIngredient) {
      insumos.update(editingIngredient.id, { nombre: ingredientForm.name, unidad: toApiUnit(ingredientForm.unit), stockActual: ingredientForm.stock, stockMinimo: ingredientForm.minStock, costoUnitario: ingredientForm.costPerUnit, proveedor: ingredientForm.proveedor || null }, "inventory").then(() => {
        setIngredients(prev => prev.map(i => i.id === editingIngredient.id ? { ...i, ...ingredientForm } : i))
        toast({ title: "Insumo actualizado" })
        setShowIngredientDialog(false)
      }).catch(e => toast({ title: "Error", description: String(e), variant: "destructive" }))
    } else {
      insumos.create({ nombre: ingredientForm.name, unidad: toApiUnit(ingredientForm.unit), stockActual: ingredientForm.stock, stockMinimo: ingredientForm.minStock, costoUnitario: ingredientForm.costPerUnit, proveedor: ingredientForm.proveedor || null }, "inventory").then(created => {
        setIngredients(prev => [...prev, { ...ingredientForm, id: created.id }])
        toast({ title: "Insumo creado" })
        setShowIngredientDialog(false)
      }).catch(e => toast({ title: "Error", description: String(e), variant: "destructive" }))
    }
  }
  const deleteIngredient = (id: string) => {
    insumos.remove(id, "inventory").then(() => {
      setIngredients(prev => prev.filter(i => i.id !== id))
      toast({ title: "Insumo eliminado" })
    }).catch(e => toast({ title: "Error", description: String(e), variant: "destructive" }))
  }

  // ── Menu item dialog ───────────────────────────────────────────────────────
  const [showMenuDialog, setShowMenuDialog] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItemDef | null>(null)
  const [menuForm, setMenuForm] = useState(blankMenuItem())

  const openNewMenuItem = () => { setEditingMenuItem(null); setMenuForm(blankMenuItem()); setShowMenuDialog(true) }
  const openEditMenuItem = (m: MenuItemDef) => {
    setEditingMenuItem(m)
    setMenuForm({ name: m.name, category: m.category, salePrice: m.salePrice, active: m.active, notes: m.notes, modifiers: m.modifiers })
    setShowMenuDialog(true)
  }
  const saveMenuItem = () => {
    if (!menuForm.name.trim()) { toast({ title: "El nombre es requerido" }); return }
    if (editingMenuItem) {
      const catId = editingMenuItem.categoryId
      const payload: Record<string, unknown> = { nombre: menuForm.name, precio: menuForm.salePrice, disponible: menuForm.active }
      if (catId) payload.categoriaId = catId
      platillosApi.update(editingMenuItem.id, payload).then(() => {
        setMenuItems(prev => prev.map(m => m.id === editingMenuItem.id ? { ...m, ...menuForm, categoryId: editingMenuItem.categoryId } : m))
        toast({ title: "Platillo actualizado" })
        setShowMenuDialog(false)
      }).catch(e => toast({ title: "Error", description: String(e), variant: "destructive" }))
    } else {
      toast({ title: "Crea platillos desde el módulo de Administración" })
    }
  }
  const deleteMenuItem = (id: string) => {
    platillosApi.remove(id).then(() => {
      setMenuItems(prev => prev.filter(m => m.id !== id))
      setRecipes(prev => prev.filter(r => r.menuItemId !== id))
      toast({ title: "Platillo eliminado", description: "La receta asociada también fue eliminada." })
    }).catch(e => toast({ title: "Error", description: String(e), variant: "destructive" }))
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
    recetas.update(recipeMenuItemId, validLines.map(l => ({ insumoId: l.ingredientId, cantidad: l.quantity })), "inventory").then(() => {
      const recipe: Recipe = { id: recipeMenuItemId, menuItemId: recipeMenuItemId, lines: validLines, notes: recipeNotes }
      if (editingRecipe) {
        setRecipes(prev => prev.map(r => r.menuItemId === recipeMenuItemId ? recipe : r))
        toast({ title: "Receta actualizada" })
      } else {
        setRecipes(prev => [...prev, recipe])
        toast({ title: "Receta creada" })
      }
      setShowRecipeDialog(false)
    }).catch(e => toast({ title: "Error", description: String(e), variant: "destructive" }))
  }
  const deleteRecipe = (id: string) => {
    recetas.remove(id, "inventory").then(() => {
      setRecipes(prev => prev.filter(r => r.id !== id))
      toast({ title: "Receta eliminada" })
    }).catch(e => toast({ title: "Error", description: String(e), variant: "destructive" }))
  }

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

    const ing = ingredients.find(i => i.id === movementForm.ingredientId)
    if (!ing) { toast({ title: "Insumo no encontrado" }); return }

    let tipo: "entrada" | "salida"
    let cantidad: number

    if (movementForm.type === "entrada") {
      tipo = "entrada"; cantidad = movementForm.quantity
    } else if (movementForm.type === "ajuste") {
      const delta = movementForm.quantity - ing.stock
      if (delta === 0) { toast({ title: "Sin cambios" }); return }
      tipo = delta > 0 ? "entrada" : "salida"
      cantidad = Math.abs(delta)
    } else {
      tipo = "salida"; cantidad = movementForm.quantity
    }

    const motivo = movementForm.type === "merma" ? `[Merma] ${movementForm.reason}` : movementForm.type === "ajuste" ? `[Ajuste] ${movementForm.reason}` : movementForm.reason

    insumos.ajustarStock(movementForm.ingredientId, { tipo, cantidad, motivo }, "inventory").then(updated => {
      setIngredients(prev => prev.map(i => i.id === movementForm.ingredientId ? { ...i, stock: updated.stockActual } : i))
      refreshMovements()
      toast({ title: "Movimiento registrado" })
      setShowMovementDialog(false)
    }).catch(e => toast({ title: "Error", description: String(e), variant: "destructive" }))
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const lowStockIngredients = useMemo(() => ingredients.filter(i => i.active && i.stock <= i.minStock), [ingredients])

  const dynamicMenuCategories = useMemo(() => Array.from(new Set(menuItems.map(m => m.category).filter(Boolean))).sort(), [menuItems])
  const dynamicIngredientCategories = useMemo(() => {
    const fromData = Array.from(new Set(ingredients.map(i => i.category).filter(Boolean)))
    const merged = new Set([...ingredientCategories, ...fromData])
    return Array.from(merged).sort()
  }, [ingredients])

  const ingredientsById = useMemo(() => new Map(ingredients.map(i => [i.id, i])), [ingredients])

  const recipeCost = (menuItemId: string): number => {
    const recipe = recipes.find(r => r.menuItemId === menuItemId)
    if (!recipe) return 0
    return recipe.lines.reduce((sum, line) => {
      const ing = ingredientsById.get(line.ingredientId)
      return sum + (ing ? ing.costPerUnit * line.quantity : 0)
    }, 0)
  }

  const recipePortions = (menuItemId: string): number => {
    const recipe = recipes.find(r => r.menuItemId === menuItemId)
    if (!recipe || recipe.lines.length === 0) return Infinity
    return Math.floor(Math.min(...recipe.lines.map(line => {
      const ing = ingredientsById.get(line.ingredientId)
      if (!ing || line.quantity <= 0) return Infinity
      return ing.stock / line.quantity
    })))
  }

  const modifierAvailability = (menuItemId: string): ModifierAvailability[] => {
    const item = menuItems.find(m => m.id === menuItemId)
    if (!item) return []

    return item.modifiers.flatMap(group =>
      group.opciones
        .filter(option => option.activo && option.insumoId && option.cantidadInsumo && option.cantidadInsumo > 0)
        .map(option => {
          const ing = ingredientsById.get(option.insumoId || "")
          const quantity = option.cantidadInsumo || 0
          const stock = ing?.stock ?? 0
          return {
            groupName: group.grupoNombre,
            optionName: option.nombre,
            ingredientName: option.insumoNombre || ing?.name || "Insumo",
            unit: ing?.unit || "",
            stock,
            quantity,
            portions: quantity > 0 ? Math.floor(stock / quantity) : 0,
          }
        })
    )
  }

  const dishAvailability = (menuItemId: string): DishAvailability => {
    const recipe = recipes.find(r => r.menuItemId === menuItemId)
    const hasRecipe = !!recipe && recipe.lines.length > 0
    const basePortions = recipePortions(menuItemId)
    const modifierDetails = modifierAvailability(menuItemId)
    const modifierTotal = modifierDetails.reduce((sum, detail) => sum + detail.portions, 0)

    if (hasRecipe && modifierDetails.length > 0) {
      return {
        hasRecipe,
        recipePortions: basePortions,
        modifierDetails,
        modifierTotal,
        portions: Math.min(basePortions, modifierTotal),
        source: "mixed",
      }
    }

    if (modifierDetails.length > 0) {
      return {
        hasRecipe,
        recipePortions: basePortions,
        modifierDetails,
        modifierTotal,
        portions: modifierTotal,
        source: "modifiers",
      }
    }

    if (hasRecipe) {
      return {
        hasRecipe,
        recipePortions: basePortions,
        modifierDetails: [],
        modifierTotal: 0,
        portions: basePortions,
        source: "recipe",
      }
    }

    return {
      hasRecipe,
      recipePortions: Infinity,
      modifierDetails: [],
      modifierTotal: 0,
      portions: Infinity,
      source: "none",
    }
  }

  const canMakePortions = (menuItemId: string): number => dishAvailability(menuItemId).portions

  const totalInventoryValue = useMemo(() => ingredients.reduce((sum, i) => sum + i.stock * i.costPerUnit, 0), [ingredients])
  const todayInventorySummary = useMemo(() => {
    const now = new Date()
    const todayMovements = movements.filter(m => {
      const d = new Date(m.date)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    })
    const totalBy = (predicate: (m: StockMovement) => boolean) =>
      todayMovements.filter(predicate).reduce((sum, m) => sum + m.quantity, 0)
    const salesByIngredient = new Map<string, number>()
    todayMovements
      .filter(m => m.type === "salida" && m.reason.toLowerCase().startsWith("venta"))
      .forEach(m => salesByIngredient.set(m.ingredientId, (salesByIngredient.get(m.ingredientId) || 0) + m.quantity))

    return {
      entradas: totalBy(m => m.type === "entrada"),
      salidasVenta: totalBy(m => m.type === "salida" && m.reason.toLowerCase().startsWith("venta")),
      mermas: totalBy(m => m.type === "merma"),
      ajustes: totalBy(m => m.type === "ajuste"),
      ventasTop: Array.from(salesByIngredient.entries())
        .map(([ingredientId, qty]) => ({ ingredientId, qty, ing: ingredients.find(i => i.id === ingredientId) }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 6),
    }
  }, [ingredients, movements])

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center">Cargando...</div>

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 py-3">
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
              {branches.length > 0 && (
                <Select value={activeBranchId} onValueChange={changeBranch}>
                  <SelectTrigger className="h-9 w-[170px] bg-background">
                    <SelectValue placeholder="Sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setSearch("") }}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="dashboard"><Package className="w-4 h-4 mr-1 hidden sm:inline" />Resumen</TabsTrigger>
            <TabsTrigger value="ingredients"><ShoppingCart className="w-4 h-4 mr-1 hidden sm:inline" />Insumos</TabsTrigger>
            <TabsTrigger value="menu"><UtensilsCrossed className="w-4 h-4 mr-1 hidden sm:inline" />Platillos</TabsTrigger>
            <TabsTrigger value="recipes"><BookOpen className="w-4 h-4 mr-1 hidden sm:inline" />Recetas</TabsTrigger>
            <TabsTrigger value="movements"><ArrowUpDown className="w-4 h-4 mr-1 hidden sm:inline" />Movimientos</TabsTrigger>
          </TabsList>

          {/* ══ DASHBOARD ══ */}
          <TabsContent value="dashboard" className="space-y-6">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumen de inventario</CardTitle>
                <CardDescription>Operación y movimientos del día en esta sucursal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-md border p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Insumos activos
                    </div>
                    <div className="text-xl font-bold">{ingredients.filter(i => i.active).length}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Valor inventario
                    </div>
                    <div className="text-xl font-bold text-primary">Q{totalInventoryValue.toFixed(2)}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      Platillos activos
                    </div>
                    <div className="text-xl font-bold">{menuItems.filter(m => m.active).length}</div>
                  </div>
                  <div className={`rounded-md border p-3 ${lowStockIngredients.length > 0 ? "border-destructive/40 bg-destructive/5" : ""}`}>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Alertas
                    </div>
                    <div className={`text-xl font-bold ${lowStockIngredients.length > 0 ? "text-destructive" : ""}`}>{lowStockIngredients.length}</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold">Resumen del día</h3>
                    <p className="text-sm text-muted-foreground">Movimientos de inventario registrados hoy en esta sucursal</p>
                  </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Entradas</div>
                    <div className="text-lg font-bold text-green-600">{todayInventorySummary.entradas.toFixed(2)}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Rebajado por ventas</div>
                    <div className="text-lg font-bold text-primary">{todayInventorySummary.salidasVenta.toFixed(2)}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Mermas</div>
                    <div className="text-lg font-bold text-yellow-600">{todayInventorySummary.mermas.toFixed(2)}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Ajustes</div>
                    <div className="text-lg font-bold text-blue-600">{todayInventorySummary.ajustes.toFixed(2)}</div>
                  </div>
                </div>
                {todayInventorySummary.ventasTop.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Insumos más rebajados por ventas</Label>
                    {todayInventorySummary.ventasTop.map(({ ingredientId, qty, ing }) => (
                      <div key={ingredientId} className="flex justify-between text-sm rounded-md border px-3 py-2">
                        <span>{ing?.name || "Insumo eliminado"}</span>
                        <span className="font-medium">{qty.toFixed(2)} {ing?.unit || ""}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Todavía no hay rebajas por venta registradas hoy.</p>
                )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Disponibilidad de platillos</CardTitle>
                <CardDescription>Porciones posibles según recetas, insumos y modificadores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {menuItems.filter(m => m.active).map(m => {
                    const availability = dishAvailability(m.id)
                    const portions = availability.portions
                    const cost = recipeCost(m.id)
                    const margin = m.salePrice > 0 && cost > 0 ? ((m.salePrice - cost) / m.salePrice) * 100 : null
                    const hasInventoryControl = availability.source !== "none"
                    const status = !hasInventoryControl ? "sin-control" : portions === 0 ? "agotado" : portions <= 5 ? "bajo" : "ok"
                    const detailLabel =
                      availability.source === "mixed"
                        ? `Base: ${availability.recipePortions === Infinity ? "∞" : availability.recipePortions} · Modificadores: ${availability.modifierTotal}`
                        : availability.source === "modifiers"
                          ? `${availability.modifierTotal} porciones por modificadores`
                          : availability.source === "recipe"
                            ? "Calculado por receta"
                            : "Sin receta ni modificadores con insumo"
                    return (
                      <div key={m.id} className="rounded-md border border-border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{detailLabel}</div>
                          </div>
                          <Badge variant={status === "ok" ? "default" : status === "agotado" ? "destructive" : status === "bajo" ? "secondary" : "outline"} className="text-xs shrink-0">
                            {status === "sin-control" ? "Sin control" : status === "agotado" ? "Agotado" : `${portions === Infinity ? "∞" : portions} porciones`}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Costo: Q{cost.toFixed(2)}{margin !== null ? ` · Margen: ${margin.toFixed(1)}%` : ""}
                        </div>
                        {availability.modifierDetails.length > 0 && (
                          <div className="mt-3 rounded-md bg-muted/40 p-2">
                            <div className="mb-2 text-xs font-medium text-muted-foreground">Detalle por opción</div>
                            <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                              {availability.modifierDetails.map((detail, idx) => (
                                <div key={`${m.id}-${detail.groupName}-${detail.optionName}-${idx}`} className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1 text-xs">
                                  <div className="min-w-0">
                                    <div className="truncate font-medium">{detail.optionName}</div>
                                    <div className="truncate text-muted-foreground">{detail.ingredientName} · {detail.stock.toFixed(2)} {detail.unit}</div>
                                  </div>
                                  <span className="shrink-0 font-semibold">{detail.portions}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {lowStockIngredients.length > 0 && (
              <Card className="border-destructive/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    Insumos con stock bajo o agotado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                    {lowStockIngredients.map(ing => (
                      <div key={ing.id} className="flex items-center justify-between gap-3 rounded-md border border-destructive/20 bg-destructive/5 p-3">
                        <div>
                          <div className="font-medium text-sm">{ing.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Stock: <span className="font-bold text-destructive">{ing.stock} {ing.unit}</span>
                            {" "}· Mínimo: {ing.minStock} {ing.unit}
                            {ing.proveedor ? <span> · {ing.proveedor}</span> : null}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="bg-transparent shrink-0" onClick={() => openMovement("entrada", ing.id)}>
                          <TrendingUp className="w-3 h-3 mr-1" />Entrada
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
            {dynamicIngredientCategories.map(cat => {
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
                                  <span>Costo: Q{ing.costPerUnit.toFixed(2)}/{ing.unit}</span>
                                  {ing.proveedor && <span>Proveedor: {ing.proveedor}</span>}
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

          {/* ══ PLATILLOS ══ */}
          <TabsContent value="menu" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar platillo..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button size="sm" onClick={openNewMenuItem}><Plus className="w-4 h-4 mr-1" />Nuevo platillo</Button>
            </div>
            {dynamicMenuCategories.map(cat => {
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
                                  <span>Precio: <strong className="text-foreground">Q{m.salePrice.toFixed(2)}</strong></span>
                                  <span>Costo receta: Q{cost.toFixed(2)}</span>
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
                                ? `${recipe.lines.length} insumo(s) · Costo: Q${cost.toFixed(2)} · Margen: ${m.salePrice > 0 ? (((m.salePrice - cost) / m.salePrice) * 100).toFixed(1) : "—"}%`
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
                                <span className="text-xs text-muted-foreground">Q{(ing.costPerUnit * line.quantity).toFixed(2)}</span>
                              </div>
                            )
                          })}
                          <Separator className="my-1" />
                          <div className="flex justify-between text-sm font-semibold">
                            <span>Costo total</span><span>Q{cost.toFixed(2)}</span>
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
              <p className="text-sm text-muted-foreground">{movements.length} movimientos registrados</p>
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
                            {mv.type === "entrada" && mv.costPerUnit ? <div>Costo: Q{mv.costPerUnit.toFixed(2)}/{ing?.unit}</div> : null}
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
                  <SelectContent>{dynamicIngredientCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Unidad de medida</Label>
                <Input
                  list="inventory-units"
                  value={ingredientForm.unit}
                  onChange={e => setIngredientForm(p => ({ ...p, unit: e.target.value }))}
                  placeholder="kg, pz, vaso, bote..."
                />
                <datalist id="inventory-units">
                  {units.map(u => <option key={u} value={u} />)}
                </datalist>
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
              <Input value={ingredientForm.proveedor} onChange={e => setIngredientForm(p => ({ ...p, proveedor: e.target.value }))} placeholder="Nombre del proveedor (opcional)" />
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
                  <SelectContent>{dynamicMenuCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
                    {(() => { const ing = ingredients.find(i => i.id === line.ingredientId); return ing ? `Q${(ing.costPerUnit * line.quantity).toFixed(2)}` : "" })()}
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
