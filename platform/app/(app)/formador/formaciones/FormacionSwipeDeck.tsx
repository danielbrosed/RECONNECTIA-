"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { FormacionCardVM } from "@/lib/formaciones";
import { KM_WARN_THRESHOLD } from "@/lib/formacion-affinity";
import ModalShell from "../panel/ofertas/ModalShell";
import FormacionCard from "./FormacionCard";
import { likeFormacionAction, dismissFormacionAction } from "./actions";

type Dir = "like" | "dismiss";

// Pila de cartas tipo Tinder con arrastre real (Pointer Events + CSS transform),
// sin dependencias de animación. Arrastrar a la derecha = "me interesa" (solicita
// interés, va al súper-admin); a la izquierda = descartar. Botones de respaldo y
// teclado (←/→) disparan la misma salida. Optimista: avanza al soltar y revierte
// si la server action falla.
//
// La cola se lleva por IDENTIFICADOR, no por posición. Antes se avanzaba con un
// índice numérico, pero las acciones refrescan los datos del servidor y la lista
// llega más corta: el índice quedaba desplazado y **se saltaba una carta en cada
// gesto**. Filtrando por id, que la lista se acorte deja de importar.
export default function FormacionSwipeDeck({
  formaciones,
  verTodasHref,
}: {
  formaciones: FormacionCardVM[];
  verTodasHref?: string;
}) {
  const [resueltas, setResueltas] = useState<string[]>([]);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flyOut, setFlyOut] = useState<{ id: string; dir: Dir } | null>(null);
  const [avisoKm, setAvisoKm] = useState<FormacionCardVM | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const dxRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const resolviendoRef = useRef<string | null>(null);
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cola = formaciones.filter((f) => !resueltas.includes(f.id));
  const top = cola[0];
  const next = cola[1];
  const tercera = cola[2];
  const remaining = cola.length;
  const allDone = resueltas.length > 0 && cola.length === 0;

  function setDrag(v: number) {
    dxRef.current = v;
    setDx(v);
  }

  /**
   * Resuelve la carta: la saca de la cola y lanza la acción. Se llama desde el fin
   * de la animación o, si ese evento no llega, desde una salvaguarda de tiempo.
   * El guardia por identificador evita que se ejecute dos veces.
   */
  function resolver(id: string, dir: Dir) {
    if (resolviendoRef.current === id) return;
    resolviendoRef.current = id;
    if (temporizadorRef.current) {
      clearTimeout(temporizadorRef.current);
      temporizadorRef.current = null;
    }
    setFlyOut(null);
    setResueltas((r) => (r.includes(id) ? r : [...r, id]));
    startTransition(async () => {
      const res =
        dir === "like"
          ? await likeFormacionAction({ formacionId: id })
          : await dismissFormacionAction({ formacionId: id });
      if (!res.ok) {
        setResueltas((r) => r.filter((x) => x !== id)); // vuelve a la cola
        setError(res.error ?? "No se pudo completar la acción.");
      } else {
        setError(null);
      }
      resolviendoRef.current = null;
    });
  }

  // Un LIKE a una formación con desplazamiento largo pide confirmación antes de
  // salir: se avisa de los km (gesto, botones y teclado pasan todos por aquí).
  function necesitaAvisoKm(f: FormacionCardVM): boolean {
    return f.modality !== "ONLINE" && f.distanceKm != null && f.distanceKm > KM_WARN_THRESHOLD;
  }

  function triggerExit(dir: Dir, opts?: { confirmado?: boolean }) {
    if (!top || flyOut) return;
    if (dir === "like" && !opts?.confirmado && necesitaAvisoKm(top)) {
      setDrag(0);
      setAvisoKm(top);
      return;
    }
    setDrag(0);
    setFlyOut({ id: top.id, dir });
  }

  // Salvaguarda: todo el avance dependía del evento de fin de animación. Si no
  // llega (pestaña en segundo plano, animación cancelada por un refresco), los
  // botones se quedaban desactivados y la carta invisible, sin salida posible.
  useEffect(() => {
    if (!flyOut) return;
    const { id, dir } = flyOut;
    temporizadorRef.current = setTimeout(() => resolver(id, dir), 600);
    return () => {
      if (temporizadorRef.current) {
        clearTimeout(temporizadorRef.current);
        temporizadorRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyOut]);

  function onPointerDown(e: React.PointerEvent) {
    if (flyOut || !top) return;
    draggingRef.current = true;
    setDragging(true);
    startXRef.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    setDrag(e.clientX - startXRef.current);
  }
  function onPointerEnd(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const width = cardRef.current?.offsetWidth ?? 320;
    const threshold = width * 0.25;
    const cur = dxRef.current;
    setDrag(0); // snap-back o, si supera el umbral, base para el fly-out
    if (cur > threshold) triggerExit("like");
    else if (cur < -threshold) triggerExit("dismiss");
  }

  function onCardTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName !== "transform" || !flyOut) return; // ignora snap-back
    resolver(flyOut.id, flyOut.dir);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!top || flyOut) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      triggerExit("like");
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      triggerExit("dismiss");
    }
  }

  // --- estilos del top card ---
  const flying = !!top && flyOut?.id === top.id;
  let transform = "translateX(0) rotate(0deg)";
  let transition = "transform .28s var(--ease-micro)";
  if (flying) {
    const off = flyOut!.dir === "like" ? 130 : -130;
    const rot = flyOut!.dir === "like" ? 18 : -18;
    transform = `translateX(${off}%) rotate(${rot}deg)`;
    transition = "transform .35s var(--ease-cam), opacity .35s var(--ease-cam)";
  } else if (dragging) {
    transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`;
    transition = "none";
  }
  const likeOpacity = flying && flyOut!.dir === "like" ? 1 : Math.max(0, Math.min(dx / 100, 1));
  const dismissOpacity = flying && flyOut!.dir === "dismiss" ? 1 : Math.max(0, Math.min(-dx / 100, 1));

  // Progreso de salida de la carta superior (0 a 1): con él la segunda carta del
  // mazo "sube" hacia la posición de la primera mientras arrastras, como en Tinder.
  const salida = flying ? 1 : dragging ? Math.min(Math.abs(dx) / 120, 1) : 0;

  if (!top) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="card !p-8 text-center">
          <div className="h-card">
            {allDone ? "¡Listo! Has revisado todas tus recomendaciones" : "No hay formaciones recomendadas ahora"}
          </div>
          <p className="text-sm text-[color:var(--color-mute)] mt-2">
            {allDone
              ? "Cuando se publiquen nuevas formaciones que encajen con tu perfil, volverán a aparecer aquí."
              : "Cuando haya formaciones disponibles para tu perfil, aparecerán aquí."}
          </p>
          <Link href="/formador/perfil" className="btn-ghost mt-4 inline-flex">
            Completa tu perfil →
          </Link>
        </div>
        {error && (
          <div className="card !p-3 border-[color:var(--color-ink)] text-sm mt-3">{error}</div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-mono px-2 py-1 border border-[color:var(--color-line)] uppercase">
          {remaining} recomendada{remaining === 1 ? "" : "s"}
        </span>
        {verTodasHref && (
          <Link href={verTodasHref} className="eyebrow hover:text-[color:var(--color-ink)]">
            Ver todas →
          </Link>
        )}
      </div>

      {/* El padding superior da hueco a los bordes del mazo que asoman por arriba */}
      <div style={{ paddingTop: 26 }}>
      <div className="relative">
        {/* Mazo de fondo estilo Tinder: las siguientes cartas asoman por arriba.
            Se ve que hay más, pero un velo de papel tapa su contenido. */}
        {tercera && (
          <div
            aria-hidden
            className="absolute left-0 right-0 top-0 pointer-events-none"
            style={{
              transform: "translateY(-22px) rotate(-1.2deg) scale(0.97)",
              zIndex: 0,
              transition: dragging ? "none" : "transform .28s var(--ease-micro)",
            }}
          >
            <div className="relative">
              <FormacionCard formacion={tercera} />
              <div
                className="absolute inset-0"
                style={{ background: "var(--color-paper)", opacity: 0.9 }}
              />
            </div>
          </div>
        )}
        {next && (
          <div
            aria-hidden
            className="absolute left-0 right-0 top-0 pointer-events-none"
            style={{
              transform: `translateY(${-12 + 8 * salida}px) rotate(${1.5 * (1 - salida)}deg) scale(${0.985 + 0.015 * salida})`,
              zIndex: 1,
              transition: dragging ? "none" : "transform .28s var(--ease-micro)",
            }}
          >
            <div className="relative">
              <FormacionCard formacion={next} />
              <div
                className="absolute inset-0"
                style={{ background: "var(--color-paper)", opacity: 0.8 }}
              />
            </div>
          </div>
        )}

        {/* Carta superior (arrastrable) */}
        <div
          ref={cardRef}
          role="group"
          aria-roledescription="tarjeta de formación"
          aria-label={`${top.title}${top.clientName ? ` · ${top.clientName}` : ""} · afinidad ${top.affinity}%. Flecha derecha: me interesa. Flecha izquierda: descartar.`}
          tabIndex={0}
          className="relative z-10 cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ink)]"
          style={{ transform, transition, opacity: flying ? 0 : 1, touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onTransitionEnd={onCardTransitionEnd}
          onKeyDown={onKeyDown}
        >
          {/* Sellos físicos */}
          <span
            className="absolute top-4 left-4 z-20 text-xs font-mono uppercase tracking-widest px-2 py-1 border-2 border-[color:var(--color-ink)] bg-[color:var(--color-paper)] -rotate-12 pointer-events-none"
            style={{ opacity: likeOpacity }}
          >
            Me interesa
          </span>
          <span
            className="absolute top-4 right-4 z-20 text-xs font-mono uppercase tracking-widest px-2 py-1 border-2 border-[color:var(--color-mute)] bg-[color:var(--color-paper)] rotate-12 pointer-events-none"
            style={{ opacity: dismissOpacity }}
          >
            Descartar
          </span>

          <FormacionCard formacion={top} />
        </div>
      </div>
      </div>

      {/* Botones de respaldo (siempre visibles, accesibles) */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => triggerExit("dismiss")}
          disabled={!!flyOut}
          className="btn-ghost flex-1 justify-center"
          aria-label="Descartar esta formación"
        >
          ← Descartar
        </button>
        <button
          type="button"
          onClick={() => triggerExit("like")}
          disabled={!!flyOut}
          className="btn-solid flex-[2] justify-center"
          aria-label="Me interesa esta formación"
        >
          Me interesa →
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {remaining} formaciones recomendadas pendientes.
      </p>

      {error && <div className="card !p-3 border-[color:var(--color-ink)] text-sm">{error}</div>}

      {avisoKm && (
        <ModalShell onClose={() => setAvisoKm(null)} labelledBy="aviso-km-title" className="max-w-md">
          <div className="space-y-4">
            <div>
              <span className="eyebrow">Desplazamiento</span>
              <h3 id="aviso-km-title" className="h-card mt-1">
                Esta formación queda lejos
              </h3>
            </div>
            <p className="text-sm text-[color:var(--color-ink-soft)]">
              {avisoKm.modality === "HYBRID"
                ? `«${avisoKm.title}» es híbrida con parte presencial en ${
                    avisoKm.city || avisoKm.location || "otra provincia"
                  }, a unos ${avisoKm.distanceKm} km de tu ubicación.`
                : `«${avisoKm.title}» es presencial en ${
                    avisoKm.city || avisoKm.location || "otra provincia"
                  }, a unos ${avisoKm.distanceKm} km de tu ubicación.`}{" "}
              ¿Quieres solicitarla igualmente?
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setAvisoKm(null)} className="btn-ghost">
                Volver
              </button>
              <button
                type="button"
                onClick={() => {
                  setAvisoKm(null);
                  triggerExit("like", { confirmado: true });
                }}
                className="btn-solid"
              >
                Me interesa igualmente
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
