/**
 * API client for RestSF backend
 * Auth: JWT Bearer token stored per-module in localStorage
 *
 * La URL del backend se toma de NEXT_PUBLIC_API_BASE (se define en Vercel,
 * p.ej. https://api.warforgegt.com). En desarrollo, si no está, usa el
 * backend local. Ojo: en producción DEBE ser https, o el navegador bloquea
 * el contenido mixto (Vercel sirve por https).
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://localhost:5006"

// ─── Session helpers ─────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  nombre: string
  username: string
  rol: string
  modules: string[]
}

export interface SessionData {
  token: string
  user: AuthUser
}

export function getSession(module: string): SessionData | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`module_session_${module}`)
    return raw ? (JSON.parse(raw) as SessionData) : null
  } catch {
    return null
  }
}

export function getToken(module: string): string | null {
  return getSession(module)?.token ?? null
}

export function getAnyToken(): string | null {
  const modules = ["kitchen", "pos", "admin", "inventory", "billing"]
  for (const m of modules) {
    const t = getToken(m)
    if (t) return t
  }
  return null
}

export function saveSession(module: string, data: SessionData): void {
  localStorage.setItem(`module_session_${module}`, JSON.stringify(data))
}

export function clearSession(module: string): void {
  localStorage.removeItem(`module_session_${module}`)
}

// ─── Establecimiento activo (sucursal seleccionada) ──────────────────────────
// Se elige al iniciar sesión en el POS y viaja en cada request como header
// X-Establecimiento para que el backend filtre inventario, caja, menú, etc.

// Guardado POR MÓDULO: así el POS y el inventario pueden estar en sucursales
// distintas, y el admin (que no elige sucursal) nunca hereda una ajena.
const estKey = (module: string) => `establecimiento_activo_${module}`

export function getActiveEstablecimiento(module: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(estKey(module))
}

export function setActiveEstablecimiento(module: string, id: string): void {
  localStorage.setItem(estKey(module), id)
}

export function clearActiveEstablecimiento(module: string): void {
  localStorage.removeItem(estKey(module))
}

// ─── Generic fetcher ─────────────────────────────────────────────────────────

export interface ApiError {
  message: string
  status: number
}

/**
 * Sesión expirada o token inválido: limpia la sesión del módulo y
 * redirige a su pantalla de login. Evita que cada página tenga que
 * manejar el 401 por su cuenta.
 */
function handleUnauthorized(module?: string): void {
  if (typeof window === "undefined") return
  if (module) clearSession(module)
  const loginPath = module ? `/${module}/login` : "/login"
  // Evitar loops de redirección si ya estamos en un login
  if (!window.location.pathname.includes("/login")) {
    window.location.href = loginPath
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit & { module?: string } = {}
): Promise<T> {
  const { module, ...fetchOptions } = options
  const token = module ? (getToken(module) || getAnyToken()) : null
  const establecimientoId = module ? getActiveEstablecimiento(module) : null

  let res: Response
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Sucursal activa: el backend filtra por ella cuando aplica
        ...(establecimientoId ? { "X-Establecimiento": establecimientoId } : {}),
        ...(fetchOptions.headers ?? {}),
      },
    })
  } catch {
    // fetch solo rechaza por fallo de red (servidor caído, sin WiFi, DNS…),
    // no por códigos HTTP. status 0 = "no hubo respuesta del servidor".
    const err: ApiError = {
      message: "Sin conexión con el servidor. Verifica tu red e intenta de nuevo.",
      status: 0,
    }
    throw err
  }

  if (res.status === 401 && endpoint !== "/auth/login") {
    handleUnauthorized(module)
    const err: ApiError = { message: "Sesión expirada. Inicia sesión de nuevo.", status: 401 }
    throw err
  }

  if (!res.ok) {
    let message = `Error ${res.status}: ${res.statusText}`
    try {
      const rawBody = await res.json() as Record<string, unknown>
      const validationErrors = rawBody.errors as Record<string, string[]> | undefined
      if (validationErrors) {
        message = Object.entries(validationErrors).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" | ")
      } else {
        message = (rawBody.error ?? rawBody.message ?? rawBody.title ?? message) as string
      }
    } catch {
      const text = await res.text().catch(() => "")
      if (text) message = text
    }
    const err: ApiError = { message, status: res.status }
    throw err
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

// ─── Auth endpoints ──────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string
  pin: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export async function authLogin(username: string, pin: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, pin } satisfies LoginRequest),
  })
}

export async function authMe(module: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me", { module })
}

export async function authLogout(module: string): Promise<{ ok: boolean }> {
  const result = await apiFetch<{ ok: boolean }>("/auth/logout", {
    method: "POST",
    module,
  })
  clearSession(module)
  return result
}

// ─── Establecimientos (sucursales) ───────────────────────────────────────────

export interface Establecimiento {
  id: string
  nombre: string
  direccion?: string | null
  telefono?: string | null
  activo: boolean
}

export const establecimientos = {
  // Los que puede usar el usuario autenticado (selector del POS)
  getAll: (module = "pos") =>
    apiFetch<Establecimiento[]>("/establecimientos", { module }),
  // Lista pública para la cocina (anónima)
  getPublicos: () =>
    apiFetch<Establecimiento[]>("/establecimientos/publicos", { module: "kitchen" }),
  getTodos: (module = "admin") =>
    apiFetch<Establecimiento[]>("/establecimientos/todos", { module }),
  create: (data: { nombre: string; direccion?: string; telefono?: string }, module = "admin") =>
    apiFetch<Establecimiento>("/establecimientos", { method: "POST", body: JSON.stringify(data), module }),
  update: (id: string, data: { nombre?: string; direccion?: string; telefono?: string; activo?: boolean }, module = "admin") =>
    apiFetch<Establecimiento>(`/establecimientos/${id}`, { method: "PUT", body: JSON.stringify(data), module }),
}

// ─── Categorías menú ─────────────────────────────────────────────────────────

export interface CategoriaMenu {
  id: string
  nombre: string
  descripcion?: string
  activa: boolean
  orden: number
  creadoEn: string
}

export const categoriasMenu = {
  getAll: (module = "pos") =>
    apiFetch<CategoriaMenu[]>("/categorias-menu", { module }),
  getOne: (id: string, module = "pos") =>
    apiFetch<CategoriaMenu>(`/categorias-menu/${id}`, { module }),
  create: (data: Partial<CategoriaMenu>, module = "admin") =>
    apiFetch<CategoriaMenu>("/categorias-menu", {
      method: "POST",
      body: JSON.stringify(data),
      module,
    }),
  update: (id: string, data: Partial<CategoriaMenu>, module = "admin") =>
    apiFetch<CategoriaMenu>(`/categorias-menu/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      module,
    }),
  remove: (id: string, module = "admin") =>
    apiFetch<void>(`/categorias-menu/${id}`, { method: "DELETE", module }),
}

// ─── Platillos ───────────────────────────────────────────────────────────────

export interface ModificadorOpcion {
  id: string
  nombre: string
  precioDelta: number
  insumoId?: string | null
  insumoNombre?: string | null
  cantidadInsumo?: number | null
  esDefault: boolean
  activo: boolean
}

export interface ModificadorGrupo {
  grupoId: string
  grupoNombre: string
  tipo: "single" | "multiple"
  obligatorio: boolean
  minSelecciones: number
  maxSelecciones: number
  opciones: ModificadorOpcion[]
}

export interface Platillo {
  id: string
  nombre: string
  descripcion?: string
  precio: number
  categoriaId: string
  categoriaNombre?: string
  disponible: boolean
  imagen?: string
  establecimientos?: string[]   // ids de sucursales donde se ofrece
  modificadores: ModificadorGrupo[]
  creadoEn: string
}

// Forma que espera el backend al crear/actualizar (CreateModificadorGrupoDto):
// los grupos/opciones nuevos aún no tienen id
export interface CreateModificadorOpcionRequest {
  nombre: string
  precioDelta: number
  insumoId?: string | null
  cantidadInsumo?: number | null
  esDefault?: boolean
  activo?: boolean
  orden?: number
}

export interface CreateModificadorGrupoRequest {
  grupoNombre: string
  tipo: "single" | "multiple"
  obligatorio?: boolean
  minSelecciones?: number
  maxSelecciones?: number
  orden?: number
  opciones: CreateModificadorOpcionRequest[]
}

export interface CreatePlatilloRequest {
  nombre: string
  descripcion?: string
  precio: number
  categoriaId: string
  disponible?: boolean
  imagen?: string
  establecimientoIds?: string[]   // sucursales donde se ofrece
  modificadores?: CreateModificadorGrupoRequest[]
}

export const platillos = {
  // establecimientoId: filtro explícito (admin); sin él, el header del módulo
  getAll: (module = "pos", establecimientoId?: string) => {
    const q = establecimientoId ? `?establecimiento=${encodeURIComponent(establecimientoId)}` : ""
    return apiFetch<Platillo[]>(`/platillos${q}`, { module })
  },
  getOne: (id: string, module = "pos") =>
    apiFetch<Platillo>(`/platillos/${id}`, { module }),
  create: (data: CreatePlatilloRequest, module = "admin") =>
    apiFetch<Platillo>("/platillos", {
      method: "POST",
      body: JSON.stringify(data),
      module,
    }),
  update: (id: string, data: Partial<CreatePlatilloRequest>, module = "admin") =>
    apiFetch<Platillo>(`/platillos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      module,
    }),
  remove: (id: string, module = "admin") =>
    apiFetch<void>(`/platillos/${id}`, { method: "DELETE", module }),
  setDisponible: (id: string, disponible: boolean, module = "admin") =>
    apiFetch<Platillo>(`/platillos/${id}/disponible`, {
      method: "PATCH",
      body: JSON.stringify({ disponible }),
      module,
    }),
}

// ─── Secciones y Mesas ───────────────────────────────────────────────────────

export interface Mesa {
  id: string
  numero: number
  etiqueta?: string
  capacidad: number
  seccionId: string
  activa?: boolean
  notas?: string
}

export interface Seccion {
  id: string
  nombre: string
  mesas: Mesa[]
}

export const secciones = {
  // establecimientoId: filtra por sucursal (admin); sin él, el header del módulo
  getAll: (module = "pos", establecimientoId?: string) => {
    const q = establecimientoId ? `?establecimiento=${encodeURIComponent(establecimientoId)}` : ""
    return apiFetch<Seccion[]>(`/secciones${q}`, { module })
  },
  // establecimientoId en el body: el backend crea la sección en esa sucursal
  create: (data: { nombre: string; orden?: number; activa?: boolean; establecimientoId?: string }, module = "admin") =>
    apiFetch<Seccion>("/secciones", { method: "POST", body: JSON.stringify(data), module }),
  update: (id: string, data: { nombre?: string; orden?: number; activa?: boolean }, module = "admin") =>
    apiFetch<Seccion>(`/secciones/${id}`, { method: "PUT", body: JSON.stringify(data), module }),
  remove: (id: string, module = "admin") =>
    apiFetch<{ ok: boolean }>(`/secciones/${id}`, { method: "DELETE", module }),
}

export const mesas = {
  getAll: (module = "pos") =>
    apiFetch<Mesa[]>("/mesas", { module }),
  create: (data: { numero: number; capacidad: number; seccionId: string; etiqueta?: string; activa?: boolean; notas?: string }, module = "admin") =>
    apiFetch<Mesa>("/mesas", { method: "POST", body: JSON.stringify(data), module }),
  update: (id: string, data: { numero?: number; capacidad?: number; seccionId?: string; etiqueta?: string; activa?: boolean; notas?: string }, module = "admin") =>
    apiFetch<Mesa>(`/mesas/${id}`, { method: "PUT", body: JSON.stringify(data), module }),
  remove: (id: string, module = "admin") =>
    apiFetch<{ ok: boolean }>(`/mesas/${id}`, { method: "DELETE", module }),
}

// ─── Turnos ──────────────────────────────────────────────────────────────────

export interface Turno {
  id: string
  usuarioId: string
  usuarioNombre?: string
  inicio: string
  fin?: string | null
  efectivoInicial?: number
  totalVentas?: number
  totalOrdenes?: number
  ventasEfectivo?: number
  ventasTarjeta?: number
  ventasTransfer?: number
  totalEntradas?: number
  totalRetiros?: number
  efectivoEnCaja?: number      // inicial + ventas efectivo + entradas - retiros
  notas?: string | null
}

export interface MovimientoCaja {
  id: number
  turnoId: string
  tipo: "entrada" | "retiro"
  monto: number
  motivo: string
  usuarioNombre?: string | null
  registradoEn: string
}

export interface CorteInfo {
  turnoId: string
  usuarioNombre: string
  iniciadoEn: string
  cerradoEn?: string
  efectivoInicial: number
  efectivoFinalSistema: number
  efectivoFinalReal: number
  diferencia: number
  totalOrdenes: number
  totalVentas: number
  porMetodoPago: Record<string, number>
  notas?: string | null
}

export const turnos = {
  getActivo: async (module = "pos"): Promise<Turno | null> => {
    try {
      return await apiFetch<Turno>("/turnos/activo", { module })
    } catch (e) {
      // 404 = no hay turno activo — no es un error, devolver null
      if ((e as { status?: number })?.status === 404) return null
      throw e
    }
  },
  getOne: (id: string, module = "pos") =>
    apiFetch<Turno>(`/turnos/${id}`, { module }),
  create: (data: { efectivoInicial: number }, module = "pos") =>
    apiFetch<Turno>("/turnos", { method: "POST", body: JSON.stringify(data), module }),
  cerrar: (id: string, data: { efectivoFinalReal: number; notas?: string }, module = "pos") =>
    apiFetch<{ turno: Turno; corte: CorteInfo }>(`/turnos/${id}/cerrar`, {
      method: "PATCH",
      body: JSON.stringify(data),
      module,
    }),
  getMovimientos: (id: string, module = "pos") =>
    apiFetch<MovimientoCaja[]>(`/turnos/${id}/movimientos`, { module }),
  addMovimiento: (id: string, data: { tipo: "entrada" | "retiro"; monto: number; motivo: string }, module = "pos") =>
    apiFetch<MovimientoCaja>(`/turnos/${id}/movimientos`, {
      method: "POST",
      body: JSON.stringify(data),
      module,
    }),
}

// ─── Órdenes ─────────────────────────────────────────────────────────────────

export interface OrdenItem {
  id: number | string           // long en backend — llega como número
  platilloId: string
  platilloNombre?: string
  nombre?: string            // alias devuelto por algunos endpoints
  cantidad: number
  precioUnitario: number
  notas?: string
  estado: "pendiente" | "en_preparacion" | "listo" | "entregado" | "cancelado"
  modificadores?: {
    opcionId?: string
    opcionNombre?: string
    grupoNombre?: string
    precioDelta?: number
  }[]
}

export interface Orden {
  id: string
  mesaId?: string
  numeroMesa?: number
  turnoId: string
  meseroId: string
  meseroNombre?: string
  tipoServicio: "mesa" | "para_llevar" | "delivery"
  // "servido" es lo que el backend asigna cuando cocina marca la orden lista
  estado: "pendiente" | "abierta" | "en_cocina" | "lista" | "servido" | "pagada" | "cancelada" | "pagado" | "cancelado"
  items: OrdenItem[]
  subtotal: number
  impuestos: number
  total: number
  descuento?: number
  propina?: number
  comensales?: number
  clienteNombre?: string
  notas?: string
  creadoEn: string
  actualizadoEn?: string
}

export interface UpdateOrdenRequest {
  descuento: number
  propina: number
  notas?: string | null
  comensales: number
  clienteNombre?: string | null
}

export interface CreateOrdenItemRequest {
  platilloId: string
  nombre: string
  cantidad: number
  precioUnitario: number
  notas?: string | null
  modificadores?: {
    grupoNombre: string
    opcionNombre: string
    opcionId?: string
    precioDelta?: number
  }[]
}

export interface CreateOrdenRequest {
  mesaId?: string
  turnoId: string
  meseroId: string
  tipoServicio: "mesa" | "para_llevar" | "delivery"
  comensales?: number
  clienteNombre?: string | null
  notas?: string | null
  items: CreateOrdenItemRequest[]
}

export const ordenes = {
  getAll: (module = "pos") =>
    apiFetch<Orden[]>("/ordenes", { module }),
  // Todas las órdenes de un turno (para el resumen de cierre, completo desde backend)
  getByTurno: (turnoId: string, module = "pos") =>
    apiFetch<Orden[]>(`/ordenes?turno_id=${encodeURIComponent(turnoId)}&limit=1000`, { module }),
  getOne: (id: string, module = "pos") =>
    apiFetch<Orden>(`/ordenes/${id}`, { module }),
  create: (data: CreateOrdenRequest, module = "pos") =>
    apiFetch<Orden>("/ordenes", { method: "POST", body: JSON.stringify(data), module }),
  update: (id: string, data: UpdateOrdenRequest, module = "pos") =>
    apiFetch<Orden>(`/ordenes/${id}`, { method: "PUT", body: JSON.stringify(data), module }),
  remove: (id: string, module = "pos") =>
    apiFetch<void>(`/ordenes/${id}`, { method: "DELETE", module }),
  setEstado: (id: string, estado: Orden["estado"], module = "pos") =>
    apiFetch<{ ok: boolean }>(`/ordenes/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
      module,
    }),
  // El backend devuelve la orden completa con totales recalculados
  addItem: (ordenId: string, item: CreateOrdenItemRequest, module = "pos") =>
    apiFetch<Orden>(`/ordenes/${ordenId}/items`, {
      method: "POST",
      body: JSON.stringify(item),
      module,
    }),
  updateItem: (ordenId: string, itemId: number | string, data: { cantidad: number; notas?: string | null }, module = "pos") =>
    apiFetch<Orden>(`/ordenes/${ordenId}/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(data),
      module,
    }),
  removeItem: (ordenId: string, itemId: number | string, module = "pos") =>
    apiFetch<{ ok: boolean }>(`/ordenes/${ordenId}/items/${itemId}`, { method: "DELETE", module }),
  setItemEstado: (
    ordenId: string,
    itemId: number | string,
    estado: OrdenItem["estado"],
    module = "pos"
  ) =>
    apiFetch<{ ok: boolean }>(`/ordenes/${ordenId}/items/${itemId}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
      module,
    }),
}

// ─── Cocina ──────────────────────────────────────────────────────────────────

export interface CocinaOrden {
  id: string
  mesaId?: string
  numeroMesa?: number
  meseroNombre?: string
  tipoServicio: string
  items: {
    id: number | string
    platilloNombre: string
    nombre?: string          // alias que algunos endpoints devuelven en lugar de platilloNombre
    categoria?: string | null // estación de cocina (parrilla/bebidas/postres…)
    cantidad: number
    notas?: string
    estado: "pendiente" | "en_preparacion" | "listo"
  }[]
  creadoEn: string
  estado: "abierta" | "en_cocina" | "lista"
}

// module "kitchen" para que apiFetch mande X-Establecimiento (sucursal de la cocina)
export const cocina = {
  getOrdenes: () => apiFetch<CocinaOrden[]>("/cocina/ordenes", { module: "kitchen" }),
  iniciar: (id: string) =>
    apiFetch<{ ok: boolean }>(`/cocina/ordenes/${id}/iniciar`, { method: "PATCH", module: "kitchen" }),
  listo: (id: string) =>
    apiFetch<{ ok: boolean }>(`/cocina/ordenes/${id}/listo`, { method: "PATCH", module: "kitchen" }),
  reiniciar: (id: string) =>
    apiFetch<{ ok: boolean }>(`/cocina/ordenes/${id}/reiniciar`, { method: "PATCH", module: "kitchen" }),
  // KDS por platillo: persiste el estado de cada item en backend
  setItemEstado: (ordenId: string, itemId: number | string, estado: "pendiente" | "en_preparacion" | "listo") =>
    apiFetch<{ ok: boolean }>(`/cocina/ordenes/${ordenId}/items/${itemId}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
      module: "kitchen",
    }),
}

// ─── Pagos ───────────────────────────────────────────────────────────────────

export interface PagoTender {
  // Claves de metodos_pago en BD: "cash" | "card" | "transfer"
  metodo: "cash" | "card" | "transfer" | string
  monto: number
  referenciaLote?: string | null
  referenciaTransf?: string | null
}

export interface Pago {
  id: string
  ordenId: string
  establecimientoId?: string | null
  turnoId: string
  meseroId?: string
  meseroNombre?: string
  montoTotal: number
  ticketNumero?: number | null
  ticketCorrelativo?: string | null
  facturado: boolean
  registradoEn: string
  tenders: PagoTender[]
}

export interface CreatePagoRequest {
  ordenId?: string
  turnoId: string
  meseroId?: string
  tenders: PagoTender[]
}

export const pagos = {
  getAll: (module = "billing") =>
    apiFetch<Pago[]>("/pagos", { module }),
  getOne: (id: string, module = "billing") =>
    apiFetch<Pago>(`/pagos/${id}`, { module }),
  create: (data: CreatePagoRequest, module = "pos") =>
    apiFetch<Pago>("/pagos", { method: "POST", body: JSON.stringify(data), module }),
  setFacturado: (id: string, facturado: boolean, module = "billing") =>
    apiFetch<Pago>(`/pagos/${id}/facturado`, {
      method: "PATCH",
      body: JSON.stringify({ facturado }),
      module,
    }),
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export interface Usuario {
  id: string
  nombre: string
  username: string
  rol: "admin" | "cajero" | "mesero" | "cocina"
  activo: boolean
  modules: string[]
  establecimientoIds: string[]   // sucursales donde puede operar (vacío = todas)
  creadoEn: string
}

export interface CreateUsuarioRequest {
  nombre: string
  username: string
  pin: string
  rol: Usuario["rol"]
  modules: string[]
  establecimientoIds: string[]
}

export const usuarios = {
  getAll: (module = "admin") =>
    apiFetch<Usuario[]>("/usuarios", { module }),
  getOne: (id: string, module = "admin") =>
    apiFetch<Usuario>(`/usuarios/${id}`, { module }),
  create: (data: CreateUsuarioRequest, module = "admin") =>
    apiFetch<Usuario>("/usuarios", { method: "POST", body: JSON.stringify(data), module }),
  update: (id: string, data: Partial<CreateUsuarioRequest> & { activo?: boolean }, module = "admin") =>
    apiFetch<Usuario>(`/usuarios/${id}`, { method: "PUT", body: JSON.stringify(data), module }),
  remove: (id: string, module = "admin") =>
    apiFetch<void>(`/usuarios/${id}`, { method: "DELETE", module }),
}

// ─── Configuración ────────────────────────────────────────────────────────────

export interface ConfigNegocio {
  nombre: string
  sucursalNombre?: string | null
  rfc?: string | null
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  logo?: string | null
  ticketHeader?: string | null
  ticketFooter?: string | null
  moneda: string
  zonaHoraria: string
}

export interface ConfigImpuestos {
  ivaActivo: boolean
  ivaPorcentaje: number
  iepsTabaco: number
  iepsBebidas: number
  preciosConIva: boolean
  propinaActiva?: boolean
  propinaSugerida?: number
  cargoServicioActivo?: boolean
  cargoServicioPorcentaje?: number
}

export interface MetodoPago {
  id: string
  nombre: string
  clave: string
  activo: boolean
  requiereReferencia: boolean
}

export interface CreateMetodoPagoRequest {
  nombre: string
  activo?: boolean
  requiereReferencia?: boolean
}

export interface UpdateMetodoPagoRequest {
  nombre?: string
  activo?: boolean
  requiereReferencia?: boolean
}

export interface VerificarPinResponse {
  ok: boolean
  usuario?: { id: string; nombre: string; rol: string }
}

export interface ComandaItem {
  id: string
  nombre: string
  categoria?: string
  cantidad: number
  precioUnitario: number
}

export interface ComandaAdmin {
  id: string
  fecha: string
  mesaNumero?: number
  meseroNombre?: string
  cajeroNombre?: string
  metodoPago?: string
  subtotal: number
  impuesto: number
  descuento: number
  propina: number
  total: number
  notas?: string
  anulada: boolean
  items: ComandaItem[]
}

export interface ComandaTicketResponse {
  id: string
  fecha: string
  mesaNumero?: number
  meseroNombre?: string
  cajeroNombre?: string
  metodoPago?: string
  subtotal: number
  impuesto: number
  descuento: number
  propina: number
  total: number
  notas?: string
  anulada: boolean
  items: ComandaItem[]
}

export const config = {
  getNegocio: (module = "admin", establecimientoId?: string) =>
    apiFetch<ConfigNegocio>(`/config/negocio${establecimientoId ? `?establecimiento=${encodeURIComponent(establecimientoId)}` : ""}`, { module }),
  updateNegocio: (data: Partial<ConfigNegocio>, module = "admin") =>
    apiFetch<ConfigNegocio>("/config/negocio", { method: "PUT", body: JSON.stringify(data), module }),
  getImpuestos: (module = "admin", establecimientoId?: string) =>
    apiFetch<ConfigImpuestos>(`/config/impuestos${establecimientoId ? `?establecimiento=${encodeURIComponent(establecimientoId)}` : ""}`, { module }),
  updateImpuestos: (data: Partial<ConfigImpuestos>, module = "admin", establecimientoId?: string) =>
    apiFetch<ConfigImpuestos>(`/config/impuestos${establecimientoId ? `?establecimiento=${encodeURIComponent(establecimientoId)}` : ""}`, { method: "PUT", body: JSON.stringify(data), module }),
  getMetodosPago: (module = "admin") =>
    apiFetch<MetodoPago[]>("/config/metodos-pago", { module }),
  createMetodoPago: (data: CreateMetodoPagoRequest, module = "admin") =>
    apiFetch<MetodoPago>("/config/metodos-pago", {
      method: "POST",
      body: JSON.stringify(data),
      module,
    }),
  updateMetodoPago: (id: string, data: UpdateMetodoPagoRequest, module = "admin") =>
    apiFetch<MetodoPago>(`/config/metodos-pago/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      module,
    }),
  deleteMetodoPago: (id: string, module = "admin") =>
    apiFetch<void>(`/config/metodos-pago/${id}`, {
      method: "DELETE",
      module,
    }),
  verificarPin: (pin: string, module = "pos") =>
    apiFetch<VerificarPinResponse>("/config/verificar-pin", {
      method: "POST",
      body: JSON.stringify({ pin }),
      module,
    }),
  getComandas: (
    params?: {
      desde?: string
      hasta?: string
      mesa?: string
      mesero?: string
      metodo?: string
      estado?: string
      pagina?: number
      porPagina?: number
    },
    module = "admin"
  ) => {
    const p = new URLSearchParams()
    if (params?.desde) p.set("desde", params.desde)
    if (params?.hasta) p.set("hasta", params.hasta)
    if (params?.mesa) p.set("mesa", params.mesa)
    if (params?.mesero) p.set("mesero", params.mesero)
    if (params?.metodo) p.set("metodo", params.metodo)
    if (params?.estado) p.set("estado", params.estado)
    if (params?.pagina) p.set("pagina", String(params.pagina))
    if (params?.porPagina) p.set("porPagina", String(params.porPagina))
    const q = p.toString()
    return apiFetch<ComandaAdmin[]>(`/config/comandas${q ? `?${q}` : ""}`, { module })
  },
  getComanda: (id: string, module = "admin") =>
    apiFetch<ComandaAdmin>(`/config/comandas/${id}`, { module }),
  updateComanda: (
    id: string,
    data: { descuento?: number; propina?: number; notas?: string },
    module = "admin"
  ) =>
    apiFetch<ComandaAdmin>(`/config/comandas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      module,
    }),
  anularComanda: (id: string, motivo: string, module = "admin") =>
    apiFetch<ComandaAdmin>(`/config/comandas/${id}/anular`, {
      method: "PATCH",
      body: JSON.stringify({ motivo }),
      module,
    }),
  deleteComanda: (id: string, module = "admin") =>
    apiFetch<void>(`/config/comandas/${id}`, {
      method: "DELETE",
      module,
    }),
  getComandaTicket: (id: string, module = "admin") =>
    apiFetch<ComandaTicketResponse>(`/config/comandas/${id}/ticket`, { module }),
}

// ─── Insumos (Inventario) ────────────────────────────────────────────────────

export interface Insumo {
  id: string
  nombre: string
  unidad: string
  stockActual: number
  stockMinimo: number
  costoUnitario: number
  categoriaId?: string | null
  categoriaNombre?: string | null
  establecimientoId?: string | null
  establecimientoNombre?: string | null
  proveedor?: string | null
  activo: boolean
  notas?: string | null
  actualizadoEn: string
}

export interface CreateInsumoRequest {
  nombre: string
  unidad: Insumo["unidad"]
  stockActual: number
  stockMinimo: number
  costoUnitario: number
  categoriaId?: string | null
  proveedor?: string | null
  notas?: string | null
}

export interface AjusteStockRequest {
  tipo: "entrada" | "salida"
  cantidad: number
  motivo: string
}

export const insumos = {
  // establecimientoId: filtro explícito para la vista consolidada del admin
  // (sin él, el header X-Establecimiento del módulo decide)
  getAll: (module = "inventory", establecimientoId?: string) => {
    const q = establecimientoId ? `?establecimiento=${encodeURIComponent(establecimientoId)}` : ""
    return apiFetch<Insumo[]>(`/insumos${q}`, { module })
  },
  getOne: (id: string, module = "inventory") =>
    apiFetch<Insumo>(`/insumos/${id}`, { module }),
  create: (data: CreateInsumoRequest, module = "admin", establecimientoId?: string) =>
    apiFetch<Insumo>("/insumos", {
      method: "POST",
      body: JSON.stringify(data),
      module,
      headers: establecimientoId ? { "X-Establecimiento": establecimientoId } : undefined,
    }),
  update: (id: string, data: Partial<CreateInsumoRequest> & { activo?: boolean }, module = "admin") =>
    apiFetch<Insumo>(`/insumos/${id}`, { method: "PUT", body: JSON.stringify(data), module }),
  remove: (id: string, module = "admin") =>
    apiFetch<void>(`/insumos/${id}`, { method: "DELETE", module }),
  ajustarStock: (id: string, data: AjusteStockRequest, module = "inventory") =>
    apiFetch<Insumo>(`/insumos/${id}/ajuste`, {
      method: "PATCH",
      body: JSON.stringify(data),
      module,
    }),
}

// ─── Insumos Movimientos ──────────────────────────────────────────────────────

export interface InsumoMovimiento {
  id: number
  insumoId: string
  insumoNombre?: string
  tipo: "entrada" | "salida" | "ajuste" | "merma"
  cantidad: number
  costoPorUnidad?: number | null
  motivo: string
  usuarioId?: string | null
  ordenId?: string | null
  registradoEn: string
}

export interface CreateMovimientoRequest {
  tipo: "entrada" | "salida" | "ajuste" | "merma"
  insumoId: string
  cantidad: number
  motivo: string
  costoPorUnidad?: number | null
  ordenId?: string | null
}

// ─── Corte de inventario ─────────────────────────────────────────────────────

export interface PreconteoItem {
  insumoId: string
  nombre: string
  unidad: string
  costoUnitario: number
  encontre: number
  ingreso: number
  quedo: number
  vendidoTeorico: number
}

export interface Preconteo {
  turnoId: string
  establecimientoId?: string | null
  items: PreconteoItem[]
}

export interface CorteInventarioDetalle {
  insumoId: string
  insumoNombre: string
  unidad: string
  encontre: number
  ingreso: number
  quedo: number
  vendidoTeorico: number
  consumidoFisico: number
  merma: number
  valorMerma: number
}

export interface CorteInventario {
  id: string
  turnoId: string
  fecha: string
  totalMermaValor: number
  detalles: CorteInventarioDetalle[]
}

export const cortesInventario = {
  preconteo: (turnoId: string, module = "pos") =>
    apiFetch<Preconteo>(`/cortes-inventario/preconteo?turnoId=${encodeURIComponent(turnoId)}`, { module }),
  create: (data: { turnoId: string; notas?: string; detalles: { insumoId: string; encontre: number; ingreso: number; quedo: number }[] }, module = "pos") =>
    apiFetch<CorteInventario>("/cortes-inventario", { method: "POST", body: JSON.stringify(data), module }),
  getOne: (id: string, module = "pos") =>
    apiFetch<CorteInventario>(`/cortes-inventario/${id}`, { module }),
}

export const movimientos = {
  getAll: (params: { insumoId?: string; tipo?: string; desde?: string; hasta?: string; limit?: number } = {}, module = "inventory") => {
    const q = new URLSearchParams()
    if (params.insumoId) q.set("insumo_id", params.insumoId)
    if (params.tipo) q.set("tipo", params.tipo)
    if (params.desde) q.set("desde", params.desde)
    if (params.hasta) q.set("hasta", params.hasta)
    if (params.limit) q.set("limit", String(params.limit))
    const qs = q.toString()
    return apiFetch<InsumoMovimiento[]>(`/insumos/movimientos${qs ? `?${qs}` : ""}`, { module })
  },
  create: (data: CreateMovimientoRequest, module = "inventory") =>
    apiFetch<InsumoMovimiento>("/insumos/movimientos", { method: "POST", body: JSON.stringify(data), module }),
}

// ─── Recetas ─────────────────────────────────────────────────────────────────

export interface RecetaIngrediente {
  insumoId: string
  insumoNombre: string
  unidad: string
  cantidad: number
}

export interface Receta {
  id?: string
  platilloId: string
  platilloNombre: string
  ingredientes: RecetaIngrediente[]
}

export const recetas = {
  getAll: (module = "inventory") =>
    apiFetch<Receta[]>("/recetas", { module }),
  getOne: (platilloId: string, module = "inventory") =>
    apiFetch<Receta>(`/recetas/${platilloId}`, { module }),
  update: (
    platilloId: string,
    ingredientes: { insumoId: string; cantidad: number }[],
    module = "admin"
  ) =>
    apiFetch<Receta>(`/recetas/${platilloId}`, {
      method: "PUT",
      body: JSON.stringify({ ingredientes }),
      module,
    }),
  remove: (platilloId: string, module = "admin") =>
    apiFetch<void>(`/recetas/${platilloId}`, { method: "DELETE", module }),
}

// ─── Reportes ─────────────────────────────────────────────────────────────────

export interface ReporteVentas {
  desde: string
  hasta: string
  totalVentas: number
  totalOrdenes: number
  ticketPromedio: number
  porMetodoPago: Record<string, number>
  porDia: { fecha: string; total: number; ordenes: number }[]
  porEstablecimiento?: { establecimientoId?: string | null; nombre: string; total: number; ordenes: number }[]
}

export interface ReportePlatillos {
  desde: string
  hasta: string
  platillos: {
    platilloId: string
    nombre: string
    cantidadVendida: number
    totalGenerado: number
    porcentajeSobreTotal: number
  }[]
}

export interface ReporteMeseros {
  desde: string
  hasta: string
  meseros: {
    usuarioId: string
    nombre: string
    ordenes: number
    totalVentas: number
  }[]
}

export interface ReporteInventario {
  desde: string
  hasta: string
  totalEntradas: number
  totalSalidasVenta: number
  totalMermas: number
  totalAjustes: number
  valorSalidasVenta: number
  insumos: {
    insumoId: string
    insumoNombre: string
    unidad: string
    cantidadEntrada: number
    cantidadSalidaVenta: number
    cantidadMerma: number
    cantidadAjuste: number
    valorSalidaVenta: number
  }[]
  necesidades: {
    turnoId: string
    usuarioNombre: string
    cerradoEn: string
    notas: string
  }[]
}

function dateParams(desde?: string, hasta?: string, establecimiento?: string): string {
  const p = new URLSearchParams()
  if (desde) p.set("desde", desde)
  if (hasta) p.set("hasta", hasta)
  if (establecimiento) p.set("establecimiento", establecimiento)
  const s = p.toString()
  return s ? `?${s}` : ""
}

// establecimientoId: filtra por sucursal; sin él = consolidado del negocio
export const reportes = {
  ventas: (desde?: string, hasta?: string, module = "reports", establecimientoId?: string) =>
    apiFetch<ReporteVentas>(`/reportes/ventas${dateParams(desde, hasta, establecimientoId)}`, { module }),
  platillos: (desde?: string, hasta?: string, module = "reports", establecimientoId?: string) =>
    apiFetch<ReportePlatillos>(`/reportes/platillos${dateParams(desde, hasta, establecimientoId)}`, { module }),
  corteCaja: (turnoId?: string, module = "reports", establecimientoId?: string) => {
    const p = new URLSearchParams()
    if (turnoId) p.set("turnoId", turnoId)
    if (establecimientoId) p.set("establecimiento", establecimientoId)
    const q = p.toString()
    return apiFetch<CorteInfo>(`/reportes/corte-caja${q ? `?${q}` : ""}`, { module })
  },
  meseros: (desde?: string, hasta?: string, module = "reports", establecimientoId?: string) =>
    apiFetch<ReporteMeseros>(`/reportes/meseros${dateParams(desde, hasta, establecimientoId)}`, { module }),
  inventario: (desde?: string, hasta?: string, module = "reports", establecimientoId?: string) =>
    apiFetch<ReporteInventario>(`/reportes/inventario${dateParams(desde, hasta, establecimientoId)}`, { module }),
}

// ─── Facturas ─────────────────────────────────────────────────────────────────

export interface Factura {
  id: string
  pagoId: string
  folio: string
  clienteNombre?: string | null
  clienteRfc?: string | null
  subtotal: number
  impuestos: number
  total: number
  fechaEmision: string
  cancelada: boolean
}

export interface FacturasListResponse {
  total: number
  pagina: number
  porPagina: number
  datos: Factura[]
}

export interface CreateFacturaRequest {
  pagoId: string
  clienteNombre?: string
  clienteRfc?: string
  usoCfdi?: string | null
}

export const facturas = {
  getAll: (
    params?: { desde?: string; hasta?: string; pagina?: number; porPagina?: number },
    module = "billing"
  ) => {
    const p = new URLSearchParams()
    if (params?.desde) p.set("desde", params.desde)
    if (params?.hasta) p.set("hasta", params.hasta)
    if (params?.pagina) p.set("pagina", String(params.pagina))
    if (params?.porPagina) p.set("porPagina", String(params.porPagina))
    const q = p.toString()
    return apiFetch<FacturasListResponse>(`/facturas${q ? `?${q}` : ""}`, { module })
  },
  getOne: (id: string, module = "billing") =>
    apiFetch<Factura>(`/facturas/${id}`, { module }),
  create: (data: CreateFacturaRequest, module = "billing") =>
    apiFetch<Factura>("/facturas", { method: "POST", body: JSON.stringify(data), module }),
  cancelar: (id: string, motivo: string, module = "admin") =>
    apiFetch<Factura>(`/facturas/${id}/cancelar`, {
      method: "PATCH",
      body: JSON.stringify({ motivo }),
      module,
    }),
}

// ─── Auditoría ────────────────────────────────────────────────────────────────

export interface AuditoriaEntry {
  id: number
  usuarioId: string
  usuarioNombre: string
  accion: string
  descripcion: string
  ip?: string | null
  creadoEn: string
}

export interface AuditoriaResponse {
  total: number
  datos: AuditoriaEntry[]
}

export const auditoria = {
  getAll: (
    params?: {
      desde?: string
      hasta?: string
      usuarioId?: string
      accion?: string
      pagina?: number
      porPagina?: number
    },
    module = "admin"
  ) => {
    const p = new URLSearchParams()
    if (params?.desde) p.set("desde", params.desde)
    if (params?.hasta) p.set("hasta", params.hasta)
    if (params?.usuarioId) p.set("usuarioId", params.usuarioId)
    if (params?.accion) p.set("accion", params.accion)
    if (params?.pagina) p.set("pagina", String(params.pagina))
    if (params?.porPagina) p.set("porPagina", String(params.porPagina))
    const q = p.toString()
    return apiFetch<AuditoriaResponse>(`/auditoria${q ? `?${q}` : ""}`, { module })
  },
  // Registra una acción sensible (cancelación, descuento autorizado, etc.).
  // Fire-and-forget desde el cliente: el usuario sale del token en el backend.
  registrar: (accion: string, descripcion?: string, module = "pos") =>
    apiFetch<{ ok: boolean }>("/auditoria", {
      method: "POST",
      body: JSON.stringify({ accion, descripcion }),
      module,
    }),
}
