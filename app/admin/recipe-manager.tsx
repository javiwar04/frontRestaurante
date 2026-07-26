"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  insumos,
  platillos as platillosApi,
  recetas,
  type Insumo,
  type Platillo,
  type Receta,
} from "@/lib/api"
import { ChevronDown, ChevronUp, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react"

type RecipeLine = {
  ingredientId: string
  quantity: number
}

type LocalRecipe = {
  id: string
  menuItemId: string
  lines: RecipeLine[]
}

const norm = (value: string) => value.trim().toLowerCase()
const ingredientKey = (i: Pick<Insumo, "nombre" | "unidad">) => `${norm(i.nombre)}|${norm(i.unidad)}`

export function RecipeManager({ module = "admin" }: { module?: string }) {
  const [loading, setLoading] = useState(true)
  const [ingredients, setIngredients] = useState<Insumo[]>([])
  const [menuItems, setMenuItems] = useState<Platillo[]>([])
  const [recipeList, setRecipeList] = useState<LocalRecipe[]>([])
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [recipeMenuItemId, setRecipeMenuItemId] = useState("")
  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>([])
  const [recipeNotes, setRecipeNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [apiIngredients, apiMenuItems, apiRecipes] = await Promise.all([
        insumos.getAll(module),
        platillosApi.getAll(module),
        recetas.getAll(module),
      ])
      setIngredients(apiIngredients)
      setMenuItems(apiMenuItems)
      setRecipeList(apiRecipes.map(mapRecipe))
    } catch (e) {
      toast({ title: "No se pudieron cargar recetas", description: String((e as { message?: string })?.message ?? e), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [module])

  useEffect(() => { load() }, [load])

  const ingredientOptions = useMemo(() => {
    const map = new Map<string, Insumo>()
    ingredients
      .filter((i) => i.activo)
      .sort((a, b) => {
        const byName = a.nombre.localeCompare(b.nombre)
        if (byName !== 0) return byName
        return (b.stockActual ?? 0) - (a.stockActual ?? 0)
      })
      .forEach((i) => {
        const key = ingredientKey(i)
        if (!map.has(key)) map.set(key, i)
      })
    return Array.from(map.values())
  }, [ingredients])

  const ingredientsById = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients])
  const recipesByPlatillo = useMemo(() => new Map(recipeList.map((r) => [r.menuItemId, r])), [recipeList])

  const filteredMenuItems = useMemo(() => {
    const q = norm(search)
    return menuItems
      .filter((p) => !q || norm(p.nombre).includes(q) || norm(p.categoriaNombre ?? "").includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [menuItems, search])

  const recipeCost = (recipe?: LocalRecipe) =>
    (recipe?.lines ?? []).reduce((sum, line) => {
      const ing = ingredientsById.get(line.ingredientId)
      return sum + ((ing?.costoUnitario ?? 0) * line.quantity)
    }, 0)

  const openRecipe = (platilloId: string) => {
    const existing = recipesByPlatillo.get(platilloId)
    setRecipeMenuItemId(platilloId)
    setRecipeLines(existing ? existing.lines.map((l) => ({ ...l })) : [{ ingredientId: "", quantity: 1 }])
    setRecipeNotes("")
    setShowDialog(true)
  }

  const addRecipeLine = () => setRecipeLines((prev) => [...prev, { ingredientId: "", quantity: 1 }])
  const removeRecipeLine = (idx: number) => setRecipeLines((prev) => prev.filter((_, i) => i !== idx))
  const updateRecipeLine = (idx: number, field: keyof RecipeLine, value: string | number) => {
    setRecipeLines((prev) => prev.map((line, i) => i === idx ? { ...line, [field]: field === "quantity" ? Number(value) : value } : line))
  }

  const saveRecipe = async () => {
    const validLines = recipeLines.filter((line) => line.ingredientId && line.quantity > 0)
    if (!recipeMenuItemId) return
    if (validLines.length === 0) {
      toast({ title: "Agrega al menos un insumo con cantidad" })
      return
    }

    setSaving(true)
    try {
      await recetas.update(recipeMenuItemId, validLines.map((line) => ({ insumoId: line.ingredientId, cantidad: line.quantity })), module)
      setRecipeList((prev) => {
        const next = { id: recipeMenuItemId, menuItemId: recipeMenuItemId, lines: validLines }
        return prev.some((r) => r.menuItemId === recipeMenuItemId)
          ? prev.map((r) => r.menuItemId === recipeMenuItemId ? next : r)
          : [...prev, next]
      })
      toast({ title: "Receta guardada" })
      setShowDialog(false)
    } catch (e) {
      toast({ title: "No se pudo guardar", description: String((e as { message?: string })?.message ?? e), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const deleteRecipe = async (platilloId: string) => {
    try {
      await recetas.remove(platilloId, module)
      setRecipeList((prev) => prev.filter((r) => r.menuItemId !== platilloId))
      toast({ title: "Receta eliminada" })
    } catch (e) {
      toast({ title: "No se pudo eliminar", description: String((e as { message?: string })?.message ?? e), variant: "destructive" })
    }
  }

  const selectedPlatillo = menuItems.find((p) => p.id === recipeMenuItemId)
  const missingRecipes = menuItems.filter((p) => !recipesByPlatillo.has(p.id)).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold">Recetas</h2>
          <p className="text-xs text-muted-foreground">
            {recipeList.length} recetas configuradas · {missingRecipes} platillos sin receta
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-8 h-9 w-64" placeholder="Buscar platillo..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className="bg-transparent" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Cargando recetas...</div>
      ) : (
        <div className="space-y-2">
          {filteredMenuItems.map((platillo) => {
            const recipe = recipesByPlatillo.get(platillo.id)
            const cost = recipeCost(recipe)
            const margin = platillo.precio > 0 ? ((platillo.precio - cost) / platillo.precio) * 100 : null
            const expanded = expandedId === platillo.id

            return (
              <Card key={platillo.id} className="border-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => setExpandedId(expanded ? null : platillo.id)}
                    >
                      {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{platillo.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                          {recipe
                            ? `${recipe.lines.length} insumo(s) · Costo Q${cost.toFixed(2)}${margin === null ? "" : ` · Margen ${margin.toFixed(1)}%`}`
                            : "Sin receta"}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {!recipe && <Badge variant="outline" className="text-xs text-muted-foreground">Sin receta</Badge>}
                      <Button size="sm" variant="outline" className="h-8 bg-transparent" onClick={() => openRecipe(platillo.id)}>
                        {recipe ? <><Pencil className="w-3 h-3 mr-1" />Editar</> : <><Plus className="w-3 h-3 mr-1" />Crear</>}
                      </Button>
                      {recipe && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteRecipe(platillo.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {expanded && recipe && (
                    <div className="mt-3 ml-7 border-t border-border pt-3 space-y-1">
                      {recipe.lines.map((line, idx) => {
                        const ing = ingredientsById.get(line.ingredientId)
                        if (!ing) return null
                        return (
                          <div key={`${line.ingredientId}-${idx}`} className="flex items-center justify-between text-sm">
                            <span>{ing.nombre}</span>
                            <span className="text-xs text-muted-foreground">
                              {line.quantity} {ing.unidad} · Q{((ing.costoUnitario ?? 0) * line.quantity).toFixed(2)}
                            </span>
                          </div>
                        )
                      })}
                      <Separator className="my-2" />
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Costo total</span>
                        <span>Q{cost.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Receta: {selectedPlatillo?.nombre ?? "Platillo"}</DialogTitle>
            <DialogDescription>Insumos necesarios para preparar 1 porcion.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-2 pr-2">
              {recipeLines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={line.ingredientId} onValueChange={(value) => updateRecipeLine(idx, "ingredientId", value)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Insumo" /></SelectTrigger>
                      <SelectContent>
                        {ingredientOptions.map((ingredient) => (
                          <SelectItem key={ingredient.id} value={ingredient.id}>
                            {ingredient.nombre} ({ingredient.unidad})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    className="h-9 w-24"
                    placeholder="Cant."
                    value={line.quantity}
                    onChange={(e) => updateRecipeLine(idx, "quantity", e.target.value)}
                  />
                  <div className="w-16 text-right text-xs text-muted-foreground">
                    {(() => {
                      const ing = ingredientsById.get(line.ingredientId)
                      return ing ? `Q${((ing.costoUnitario ?? 0) * line.quantity).toFixed(2)}` : ""
                    })()}
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeRecipeLine(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-full bg-transparent" onClick={addRecipeLine}>
                <Plus className="w-4 h-4 mr-1" />Agregar insumo
              </Button>
              <Separator />
              <div className="flex justify-between px-1 text-sm font-semibold">
                <span>Costo total de receta</span>
                <span className="text-primary">
                  Q{recipeLines.reduce((sum, line) => {
                    const ing = ingredientsById.get(line.ingredientId)
                    return sum + (ing ? (ing.costoUnitario ?? 0) * line.quantity : 0)
                  }, 0).toFixed(2)}
                </span>
              </div>
              <div className="space-y-1 px-1">
                <Label className="text-xs">Notas de preparacion</Label>
                <Textarea value={recipeNotes} onChange={(e) => setRecipeNotes(e.target.value)} rows={2} placeholder="Instrucciones, tiempo, observaciones..." />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={saveRecipe} disabled={saving}>{saving ? "Guardando..." : "Guardar receta"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function mapRecipe(recipe: Receta): LocalRecipe {
  return {
    id: recipe.platilloId,
    menuItemId: recipe.platilloId,
    lines: recipe.ingredientes.map((ingredient) => ({
      ingredientId: ingredient.insumoId,
      quantity: ingredient.cantidad,
    })),
  }
}
