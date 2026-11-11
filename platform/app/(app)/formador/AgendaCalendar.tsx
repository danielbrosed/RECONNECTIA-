"use client";

import { useMemo, useState } from "react";
import { useEnvioUnico } from "@/app/_ui/useEnvioUnico";
import { MESES_ES, DIAS_SEMANA, MODO_SESION_LABELS } from "@/lib/schedule";
import type { AgendaItemVM } from "@/lib/agenda";
import type { AssignedFormacionVM } from "@/lib/formaciones";
import { FORMACION_MODALITY_LABELS } from "@/lib/formaciones";
import { diasDelCalendario, etiquetaHito, etiquetaSesion, textoHoraCalendario, type HitoCalendario } from "@/lib/formaciones-sesiones-texto";
import { deleteAgendaItemAction } from "./actions";
import AgendaEventModal from "./AgendaEventModal";

// Calendario mensual del resumen del formador. Rejilla lunes-primero portada de
// panel/calendario/CalendarClient, pero desacoplada del tenant: aquí las fuentes
// son las formaciones asignadas (Prisma, automáticas) y las entradas personales
// del JSON TrainerProfile.agenda. Navegación de mes 100% en cliente.
//
// «Hoy» llega del servidor ya resuelto en hora de España (hoyEnMadrid): si se
// calculara con new Date() aquí, servidor (UTC) y navegador no coincidirían
// entre medianoche y la 1 o las 2, y la hidratación se desajustaría.
//
// LOTE10 (C5; diseno-lote10-C.md §6): las fechas que aún se están acordando con la
// empresa (sin cerrar) y las de una propuesta del acuerdo salen con el borde de
// puntos (ESTILO_EN_ACUERDO) y su rótulo; la leyenda lo explica.

type Entry = {
  key: string;
  type: "formacion" | "evento" | "tarea";
  title: string;
  time: string | null;
  detail: string | null;
  /** LOTE07 (L7-09): «Sesión 2 de 3» en las formaciones por sesiones. */
  sesion?: string | null;
  /** LOTE08 (L8-02): en una teleformación, el día que abre, el que cierra o los dos. */
  hito?: HitoCalendario | null;
  item: AgendaItemVM | null; // solo entradas personales (para poder quitarlas)
  // Solo formaciones: true = asignada a ti (verde), false = «Me interesa» pendiente (gris).
  confirmed?: boolean;
  /** LOTE10 (C5): fechas en acuerdo con la empresa, sin cerrar (borde de puntos). */
  enAcuerdo?: boolean;
  /** LOTE10 (C5): el día de una propuesta del acuerdo (no de las fechas puestas). */
  propuesta?: boolean;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const ESTILO_PENDIENTE = "bg-[color:var(--color-paper-alt)] border border-[color:var(--color-line)]";
const ESTILO_ASIGNADA =
  "bg-[color:var(--color-ok-soft)] border border-[color:var(--color-ok)] text-[color:var(--color-ok)]";
const ESTILO_PERSONAL = "border border-dashed border-[color:var(--color-mute)]";
const ESTILO_EN_ACUERDO = "bg-[color:var(--color-paper)] border-2 border-dotted border-[color:var(--color-ok)] text-[color:var(--color-ok)]";

export default function AgendaCalendar({
  formaciones,
  items,
  hoy,
}: {
  formaciones: AssignedFormacionVM[];
  items: AgendaItemVM[];
  /** Hoy en España, "YYYY-MM-DD". */
  hoy: string;
}) {
  const [hy, hm, hd] = hoy.split("-").map(Number); // hm: 1..12
  const [cm, setCm] = useState(() => ({ y: hy, m: hm - 1 }));
  const [selected, setSelected] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDeleting] = useEnvioUnico();

  const { y, m } = cm; // m: 0..11

  function irA(nuevoY: number, nuevoM: number) {
    const d = new Date(Date.UTC(nuevoY, nuevoM, 1));
    setCm({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
    setSelected(null);
  }

  const { cells, byDay } = useMemo(() => {
    // En UTC para que servidor y navegador den la misma rejilla.
    const fd = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // lunes-primero
    const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const monthFirst = `${y}-${pad2(m + 1)}-01`;
    const monthLast = `${y}-${pad2(m + 1)}-${pad2(dim)}`;
    const byDay: Record<number, Entry[]> = {};
    const push = (day: number, e: Entry) => {
      if (!Number.isInteger(day) || day < 1 || day > dim) return;
      (byDay[day] ??= []).push(e);
    };

    // Formaciones: LOTE07 (L7-09) los días de sus fechas vigentes (calculadas
    // en el servidor) que caen en el mes visible: con sesiones, cada día de
    // sesión con sus horas y «Sesión n de m» (los días entre sesiones quedan
    // vacíos); sin rondas (datos de antes), cada día del rango recortado al mes
    // (revisión R7C-05: sin perder los meses del final de un rango largo).
    // LOTE08 (L8-02): una teleformación solo pinta el día que abre y el que
    // cierra («Apertura», «Cierre» o «Abre y cierra este día», con su hora), y
    // una sesión de Mixta dice al final del detalle si es presencial u online.
    for (const f of formaciones) {
      const detail = [
        f.clientName,
        f.city,
        FORMACION_MODALITY_LABELS[f.modality] ?? f.modality,
      ]
        .filter(Boolean)
        .join(" · ");
      diasDelCalendario(f.fechas, { desde: monthFirst, hasta: monthLast }).forEach((d, i) => {
        const time = textoHoraCalendario(d);
        const detalle = [detail, d.modo ? MODO_SESION_LABELS[d.modo] : null].filter(Boolean).join(" · ");
        push(Number(d.dia.slice(8, 10)), {
          key: `f-${f.id}-${d.dia}-${i}`,
          type: "formacion",
          title: f.title,
          time,
          detail: detalle || null,
          // Revisión R7C-06: una sesión sola no se numera («Sesión 1 de 1»).
          sesion: d.sesion && d.sesion.de > 1 ? etiquetaSesion(d.sesion.n, d.sesion.de) : null,
          hito: d.hito ?? null,
          item: null,
          confirmed: f.confirmed,
          enAcuerdo: f.enAcuerdo,
        });
      });
      // LOTE10 (C5): la propuesta viva del acuerdo con otras fechas, con el mismo trazo.
      if (f.propuestaEnAcuerdo) {
        diasDelCalendario(f.propuestaEnAcuerdo, { desde: monthFirst, hasta: monthLast }).forEach((d, i) => {
          push(Number(d.dia.slice(8, 10)), {
            key: `a-${f.id}-${d.dia}-${i}`,
            type: "formacion",
            title: f.title,
            time: textoHoraCalendario(d),
            detail: [detail, d.modo ? MODO_SESION_LABELS[d.modo] : null].filter(Boolean).join(" · ") || null,
            sesion: d.sesion && d.sesion.de > 1 ? etiquetaSesion(d.sesion.n, d.sesion.de) : null,
            hito: d.hito ?? null,
            item: null,
            confirmed: true,
            enAcuerdo: true,
            propuesta: true,
          });
        });
      }
    }

    // El índice va en la clave: las entradas antiguas no tienen id y pueden
    // repetir día y título.
    items.forEach((it, idx) => {
      if (it.date.slice(0, 7) !== `${y}-${pad2(m + 1)}`) return;
      const day = Number(it.date.slice(8, 10));
      const time = it.timeFrom ? (it.timeTo ? `${it.timeFrom} a ${it.timeTo}` : it.timeFrom) : null;
      push(day, {
        key: `p-${idx}-${it.id ?? "legado"}`,
        type: it.kind,
        title: it.title,
        time,
        detail: it.notes,
        item: it,
      });
    });

    const cells: (number | null)[] = [
      ...Array(fd).fill(null),
      ...Array.from({ length: dim }, (_, i) => i + 1),
    ];
    return { cells, byDay };
  }, [y, m, formaciones, items]);

  const today = hy === y && hm - 1 === m ? hd : -1;
  const selEntries = selected != null ? byDay[selected] ?? [] : [];
  const defaultDate = selected != null ? `${y}-${pad2(m + 1)}-${pad2(selected)}` : hoy;
  const mesTexto = MESES_ES[m].toLowerCase();

  function quitar(item: AgendaItemVM) {
    if (!window.confirm(`¿Quitar «${item.title}» de tu calendario?`)) return;
    startDeleting(async () => {
      try {
        const res = await deleteAgendaItemAction({
          id: item.id,
          date: item.date,
          title: item.title,
        });
        setError(res.ok ? null : res.error ?? "No se pudo quitar la entrada.");
      } catch {
        setError("No se pudo quitar la entrada. Revisa tu conexión e inténtalo de nuevo.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => irA(y, m - 1)}
            aria-label="Mes anterior"
            className="px-3 py-1.5 border border-[color:var(--color-line)] hover:border-[color:var(--color-ink)]"
          >
            ‹
          </button>
          <div className="h-card text-lg min-w-[160px] text-center" aria-live="polite">
            {MESES_ES[m]} {y}
          </div>
          <button
            type="button"
            onClick={() => irA(y, m + 1)}
            aria-label="Mes siguiente"
            className="px-3 py-1.5 border border-[color:var(--color-line)] hover:border-[color:var(--color-ink)]"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => irA(hy, hm - 1)}
            className="ml-1 text-xs px-3 py-1.5 border border-[color:var(--color-line)] hover:border-[color:var(--color-ink)]"
          >
            Hoy
          </button>
        </div>
        <button type="button" onClick={() => setShowAdd(true)} className="btn-ghost text-xs">
          + Añadir
        </button>
      </div>

      {/* Leyenda antes de la rejilla: sin ella los colores no se entienden. */}
      <ul
        aria-label="Qué significa cada color"
        className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[color:var(--color-ink-soft)]"
      >
        <li className="inline-flex items-center gap-2">
          <span aria-hidden className={`w-3.5 h-3.5 ${ESTILO_PENDIENTE}`} />
          Dijiste «Me interesa», pendiente
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden className={`w-3.5 h-3.5 ${ESTILO_ASIGNADA}`} />
          Asignada a ti
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden className={`w-3.5 h-3.5 ${ESTILO_EN_ACUERDO}`} />
          Fechas en acuerdo, sin cerrar
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden className={`w-3.5 h-3.5 ${ESTILO_PERSONAL}`} />
          Tus eventos y tareas
        </li>
      </ul>

      <div className="border-t border-l border-[color:var(--color-line)]">
        <div className="grid grid-cols-7" aria-hidden>
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              className="eyebrow text-center py-2 border-r border-b border-[color:var(--color-line)]"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (day === null) {
              return (
                <div
                  key={`e${idx}`}
                  aria-hidden
                  className="border-r border-b border-[color:var(--color-line)] min-h-[84px] bg-[color:var(--color-paper-alt)]/30"
                />
              );
            }
            const entradas = byDay[day] ?? [];
            const n = entradas.length;
            const esHoy = day === today;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(selected === day ? null : day)}
                aria-pressed={selected === day}
                aria-current={esHoy ? "date" : undefined}
                aria-label={`${day} de ${mesTexto}${esHoy ? ", hoy" : ""}, ${
                  n === 0 ? "sin nada programado" : n === 1 ? "1 entrada" : `${n} entradas`
                }`}
                className={`text-left align-top border-r border-b border-[color:var(--color-line)] min-h-[84px] p-1.5 space-y-1 transition-colors ${
                  selected === day
                    ? "bg-[color:var(--color-paper-alt)]"
                    : "hover:bg-[color:var(--color-paper-alt)]/50"
                }`}
              >
                <span
                  className={`inline-block text-xs font-mono px-1 ${
                    esHoy
                      ? "bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                      : "text-[color:var(--color-mute)]"
                  }`}
                >
                  {day}
                </span>
                {entradas.slice(0, 2).map((e) => (
                  <span
                    key={e.key}
                    title={e.sesion ? `${e.title} · ${e.sesion}` : e.hito ? `${e.title} · ${etiquetaHito(e.hito)}` : undefined}
                    className={`block truncate text-[10px] leading-tight px-1 py-0.5 ${
                      e.type === "formacion"
                        ? e.enAcuerdo
                          ? ESTILO_EN_ACUERDO
                          : e.confirmed
                            ? ESTILO_ASIGNADA
                            : ESTILO_PENDIENTE
                        : ESTILO_PERSONAL
                    }`}
                  >
                    {e.title}
                  </span>
                ))}
                {n > 2 && (
                  <span className="block text-[10px] text-[color:var(--color-mute)] px-1">
                    +{n - 2} más
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
                        ? e.enAcuerdo
                          ? e.propuesta
                            ? "Propuesta en acuerdo"
                            : "En acuerdo, sin cerrar"
                          : e.confirmed
                            ? "Asignada a ti"
                            : "«Me interesa», pendiente"
                        : e.type === "tarea"
                          ? "Tarea"
                          : "Evento"}
                    </span>
                    <span className="font-medium">{e.title}</span>
                    {(e.sesion || e.hito || e.time || e.detail) && (
                      <div
                        className="text-xs text-[color:var(--color-mute)] mt-0.5"
                        {...(e.sesion ? { "data-sesion-calendario": e.sesion } : {})}
                        {...(e.hito ? { "data-hito-calendario": e.hito } : {})}
                      >
                        {[e.sesion ?? (e.hito ? etiquetaHito(e.hito) : null), e.time, e.detail].filter(Boolean).join(" · ")}
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
        <div role="alert" className="card !p-3 border-[color:var(--color-ink)] text-sm">
          {error}
        </div>
      )}

      {showAdd && (
        <AgendaEventModal defaultDate={defaultDate} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}
