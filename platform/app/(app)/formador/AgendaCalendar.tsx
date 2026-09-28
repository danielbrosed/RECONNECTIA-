"use client";

import { useMemo, useState, useTransition } from "react";
import { MESES_ES, DIAS_SEMANA } from "@/lib/schedule";
import type { AgendaItemVM } from "@/lib/agenda";
import type { AssignedFormacionVM } from "@/lib/formaciones";
import { FORMACION_MODALITY_LABELS } from "@/lib/formaciones";
import { deleteAgendaItemAction } from "./actions";
import AgendaEventModal from "./AgendaEventModal";

// Calendario mensual del resumen del formador. Rejilla lunes-primero portada de
// panel/calendario/CalendarClient, pero desacoplada del tenant: aquí las fuentes
// son las formaciones asignadas (Prisma, automáticas) y las entradas personales
// del JSON TrainerProfile.agenda. Navegación de mes 100% en cliente.

type Entry = {
  key: string;
  type: "formacion" | "evento" | "tarea";
  title: string;
  time: string | null;
  detail: string | null;
  item: AgendaItemVM | null; // solo entradas personales (para poder quitarlas)
  // Solo formaciones: true = aceptada (verde), false = match pendiente (gris).
  confirmed?: boolean;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

export default function AgendaCalendar({
  formaciones,
  items,
}: {
  formaciones: AssignedFormacionVM[];
  items: AgendaItemVM[];
}) {
  const now = new Date();
  const [cm, setCm] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();

  const y = cm.getFullYear();
  const m = cm.getMonth(); // 0..11

  const { cells, byDay } = useMemo(() => {
    const fd = (new Date(y, m, 1).getDay() + 6) % 7; // lunes-primero
    const dim = new Date(y, m + 1, 0).getDate();
    const monthFirst = `${y}-${pad2(m + 1)}-01`;
    const monthLast = `${y}-${pad2(m + 1)}-${pad2(dim)}`;
    const byDay: Record<number, Entry[]> = {};
    const push = (day: number, e: Entry) => {
      if (day < 1 || day > dim) return;
      (byDay[day] ??= []).push(e);
    };

    // Formaciones asignadas: se pintan del inicio al fin, incluidos los rangos
    // que cruzan meses (se recortan al mes visible).
    for (const f of formaciones) {
      if (!f.startDate) continue;
      const endISO = f.endDate ?? f.startDate;
      if (endISO < monthFirst || f.startDate > monthLast) continue;
      const fromDay = f.startDate < monthFirst ? 1 : Number(f.startDate.slice(8, 10));
      const toDay = endISO > monthLast ? dim : Number(endISO.slice(8, 10));
      const time =
        f.startTime && f.endTime ? `${f.startTime} a ${f.endTime}` : f.startTime ?? null;
      const detail = [
        f.clientName,
        f.city,
        FORMACION_MODALITY_LABELS[f.modality] ?? f.modality,
      ]
        .filter(Boolean)
        .join(" · ");
      for (let d = fromDay; d <= toDay; d++) {
        push(d, {
          key: `f-${f.id}-${d}`,
          type: "formacion",
          title: f.title,
          time,
          detail: detail || null,
          item: null,
          confirmed: f.confirmed,
        });
      }
    }

    for (const it of items) {
      if (it.date.slice(0, 7) !== `${y}-${pad2(m + 1)}`) continue;
      const day = Number(it.date.slice(8, 10));
      const time = it.timeFrom ? (it.timeTo ? `${it.timeFrom} a ${it.timeTo}` : it.timeFrom) : null;
      push(day, {
        key: `p-${it.id ?? `${it.date}-${it.title}`}`,
        type: it.kind,
        title: it.title,
        time,
        detail: it.notes,
        item: it,
      });
    }

    const cells: (number | null)[] = [
      ...Array(fd).fill(null),
      ...Array.from({ length: dim }, (_, i) => i + 1),
    ];
    return { cells, byDay };
  }, [y, m, formaciones, items]);

  const today = now.getFullYear() === y && now.getMonth() === m ? now.getDate() : -1;
  const selEntries = selected != null ? byDay[selected] ?? [] : [];
  const defaultDate =
    selected != null
      ? `${y}-${pad2(m + 1)}-${pad2(selected)}`
      : `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  function quitar(item: AgendaItemVM) {
    startDeleting(async () => {
      const res = await deleteAgendaItemAction({
        id: item.id,
        date: item.date,
        title: item.title,
      });
      setError(res.ok ? null : res.error ?? "No se pudo quitar la entrada.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCm(new Date(y, m - 1, 1));
              setSelected(null);
            }}
            aria-label="Mes anterior"
            className="px-3 py-1.5 border border-[color:var(--color-line)] hover:border-[color:var(--color-ink)]"
          >
            ‹
          </button>
          <div className="h-card text-lg min-w-[160px] text-center">
            {MESES_ES[m]} {y}
          </div>
          <button
            type="button"
            onClick={() => {
              setCm(new Date(y, m + 1, 1));
              setSelected(null);
            }}
            aria-label="Mes siguiente"
            className="px-3 py-1.5 border border-[color:var(--color-line)] hover:border-[color:var(--color-ink)]"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => {
              setCm(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelected(null);
            }}
            className="ml-1 text-xs px-3 py-1.5 border border-[color:var(--color-line)] hover:border-[color:var(--color-ink)]"
          >
            Hoy
          </button>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} className="btn-ghost text-xs">
          + Añadir
        </button>
      </div>

      <div className="border-t border-l border-[color:var(--color-line)]">
        <div className="grid grid-cols-7">
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              className="eyebrow text-center py-2 border-r border-b border-[color:var(--color-line)]"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7" role="grid">
          {cells.map((day, idx) =>
            day === null ? (
              <div
                key={`e${idx}`}
                aria-hidden
                className="border-r border-b border-[color:var(--color-line)] min-h-[84px] bg-[color:var(--color-paper-alt)]/30"
              />
            ) : (
              <button
                key={day}
                type="button"
                role="gridcell"
                onClick={() => setSelected(selected === day ? null : day)}
                className={`text-left align-top border-r border-b border-[color:var(--color-line)] min-h-[84px] p-1.5 space-y-1 transition-colors ${
                  selected === day
                    ? "bg-[color:var(--color-paper-alt)]"
                    : "hover:bg-[color:var(--color-paper-alt)]/50"
                }`}
              >
                <span
                  className={`inline-block text-xs font-mono px-1 ${
                    day === today
                      ? "bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                      : "text-[color:var(--color-mute)]"
                  }`}
                >
                  {day}
                </span>
                {(byDay[day] ?? []).slice(0, 2).map((e) => (
                  <span
                    key={e.key}
                    className={`block truncate text-[10px] leading-tight px-1 py-0.5 ${
                      e.type === "formacion"
                        ? e.confirmed
                          ? "bg-[color:var(--color-ok-soft)] border border-[color:var(--color-ok)] text-[color:var(--color-ok)]"
                          : "bg-[color:var(--color-paper-alt)] border border-[color:var(--color-line)]"
                        : "border border-dashed border-[color:var(--color-mute)]"
                    }`}
                  >
                    {e.title}
                  </span>
                ))}
                {(byDay[day]?.length ?? 0) > 2 && (
                  <span className="block text-[10px] text-[color:var(--color-mute)] px-1">
                    +{(byDay[day]?.length ?? 0) - 2} más
                  </span>
                )}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-[color:var(--color-mute)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 bg-[color:var(--color-paper-alt)] border border-[color:var(--color-line)]" />
          Con match, pendientes de aceptar
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 bg-[color:var(--color-ok-soft)] border border-[color:var(--color-ok)]" />
          Aceptadas (asignadas a ti)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 border border-dashed border-[color:var(--color-mute)]" />
          Eventos y tareas personales
        </span>
      </div>

      {selected != null && (
        <div className="border border-[color:var(--color-line)] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="eyebrow">
              {selected} de {MESES_ES[m]} {y}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-[color:var(--color-mute)] hover:text-[color:var(--color-ink)]"
            >
              Cerrar ×
            </button>
          </div>
          {selEntries.length === 0 ? (
            <p className="text-sm text-[color:var(--color-mute)]">
              Nada programado para este día.
            </p>
          ) : (
            <ul className="space-y-2">
              {selEntries.map((e) => (
                <li key={e.key} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-[color:var(--color-mute)] mr-2">
                      {e.type === "formacion"
                        ? e.confirmed
                          ? "Formación aceptada"
                          : "Match pendiente"
                        : e.type === "tarea"
                          ? "Tarea"
                          : "Evento"}
                    </span>
                    <span className="font-medium">{e.title}</span>
                    {(e.time || e.detail) && (
                      <div className="text-xs text-[color:var(--color-mute)] mt-0.5">
                        {[e.time, e.detail].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  {e.item && (
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => quitar(e.item!)}
                      className="text-xs text-[color:var(--color-mute)] hover:text-[color:var(--color-ink)] shrink-0 disabled:opacity-40"
                    >
                      Quitar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="btn-ghost text-xs"
          >
            + Añadir en este día
          </button>
        </div>
      )}

      {error && (
        <div className="card !p-3 border-[color:var(--color-ink)] text-sm">{error}</div>
      )}

      {showAdd && (
        <AgendaEventModal defaultDate={defaultDate} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}
