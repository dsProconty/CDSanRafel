"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  alternarActivoClase,
  alternarActivoSubtipo,
  alternarActivoTipo,
  type ClaseFila,
  type PresupuestoTree,
  type SubtipoFila,
  type TipoFila,
} from "./actions";
import { ItemModal, type ModalState } from "./item-modal";

type ItemBase = {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  palabrasClave?: string | null;
};

export function PresupuestoManager({ tree }: { tree: PresupuestoTree }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tipoSeleccionado, setTipoSeleccionado] = useState<number | null>(
    tree.tipos[0]?.id ?? null
  );
  const [subtipoSeleccionado, setSubtipoSeleccionado] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  const subtipos = useMemo(
    () => tree.subtipos.filter((s) => s.tipoId === tipoSeleccionado),
    [tree.subtipos, tipoSeleccionado]
  );
  const clases = useMemo(
    () => tree.clases.filter((c) => c.subtipoId === subtipoSeleccionado),
    [tree.clases, subtipoSeleccionado]
  );

  function toggle(
    fn: (id: number, activo: boolean) => Promise<{ ok: boolean }>,
    id: number,
    activo: boolean
  ) {
    startTransition(async () => {
      await fn(id, activo);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Columna<TipoFila>
        titulo="Grupo"
        items={tree.tipos}
        seleccionadoId={tipoSeleccionado}
        onSelect={(id) => {
          setTipoSeleccionado(id);
          setSubtipoSeleccionado(null);
        }}
        onNuevo={() => setModal({ nivel: "tipo", item: null })}
        onEditar={(item) => setModal({ nivel: "tipo", item })}
        onToggle={(item) => toggle(alternarActivoTipo, item.id, !item.activo)}
        pending={pending}
      />
      <Columna<SubtipoFila>
        titulo="Tipo"
        items={subtipos}
        seleccionadoId={subtipoSeleccionado}
        onSelect={setSubtipoSeleccionado}
        onNuevo={() =>
          tipoSeleccionado && setModal({ nivel: "subtipo", item: null, tipoId: tipoSeleccionado })
        }
        onEditar={(item) => setModal({ nivel: "subtipo", item, tipoId: item.tipoId })}
        onToggle={(item) => toggle(alternarActivoSubtipo, item.id, !item.activo)}
        pending={pending}
        deshabilitado={!tipoSeleccionado}
        vacio={!tipoSeleccionado ? "Elegí un grupo primero." : "Sin tipos todavía."}
      />
      <Columna<ClaseFila>
        titulo="Subtipo"
        items={clases}
        seleccionadoId={null}
        onSelect={() => {}}
        onNuevo={() =>
          subtipoSeleccionado &&
          setModal({ nivel: "clase", item: null, subtipoId: subtipoSeleccionado })
        }
        onEditar={(item) => setModal({ nivel: "clase", item, subtipoId: item.subtipoId })}
        onToggle={(item) => toggle(alternarActivoClase, item.id, !item.activo)}
        pending={pending}
        deshabilitado={!subtipoSeleccionado}
        vacio={!subtipoSeleccionado ? "Elegí un tipo primero." : "Sin subtipos todavía."}
        mostrarPalabrasClave
      />

      {modal && (
        <ItemModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Columna<T extends ItemBase>({
  titulo,
  items,
  seleccionadoId,
  onSelect,
  onNuevo,
  onEditar,
  onToggle,
  pending,
  vacio,
  deshabilitado,
  mostrarPalabrasClave,
}: {
  titulo: string;
  items: T[];
  seleccionadoId: number | null;
  onSelect: (id: number) => void;
  onNuevo: () => void;
  onEditar: (item: T) => void;
  onToggle: (item: T) => void;
  pending: boolean;
  vacio?: string;
  deshabilitado?: boolean;
  mostrarPalabrasClave?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
        <Button size="sm" variant="outline" disabled={deshabilitado} onClick={onNuevo}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>
      <div className="max-h-[28rem] divide-y divide-border overflow-y-auto">
        {items.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {vacio ?? "Sin datos todavía."}
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 hover:bg-accent/40 ${
              seleccionadoId === item.id ? "bg-accent/60" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{item.nombre}</p>
              {mostrarPalabrasClave && item.palabrasClave && (
                <p className="truncate text-xs text-muted-foreground">🔑 {item.palabrasClave}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={item.activo ? "success" : "outline"}>
                {item.activo ? "Activo" : "Inactivo"}
              </Badge>
              <button
                type="button"
                title="Editar"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditar(item);
                }}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(item);
                }}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {item.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
