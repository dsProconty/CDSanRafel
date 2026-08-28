import type { PresupuestoTree } from "@/app/egresos/categorias/actions";

export type OpcionClase = { id: number; label: string };

// Aplana el catálogo de presupuesto (Grupo → Tipo → Subtipo, nombres de
// nivel que ve el admin — internamente son las tablas presupuestoTipo/
// Subtipo/Clase) a una lista de opciones "Grupo › Tipo › Subtipo" para un
// <select> simple — se usa tanto en el editor de informes como en la cola
// de egresos pendientes de /cargar. Solo niveles activos.
export function construirOpcionesClase(presupuesto: PresupuestoTree): OpcionClase[] {
  const tiposActivos = new Map(presupuesto.tipos.filter((t) => t.activo).map((t) => [t.id, t]));
  const subtiposActivos = presupuesto.subtipos.filter((s) => s.activo && tiposActivos.has(s.tipoId));
  const subtipoPorId = new Map(subtiposActivos.map((s) => [s.id, s]));

  return presupuesto.clases
    .filter((c) => c.activo && subtipoPorId.has(c.subtipoId))
    .map((c) => {
      const subtipo = subtipoPorId.get(c.subtipoId)!;
      const tipo = tiposActivos.get(subtipo.tipoId)!;
      return {
        id: c.id,
        label: `${tipo.nombre} › ${subtipo.nombre} › ${c.nombre}`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
