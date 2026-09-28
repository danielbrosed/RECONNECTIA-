"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LockedTalentVM } from "@/lib/empresa/talento";
import WhatsAppTopupDialog from "@/lib/skp/WhatsAppTopupDialog";
import { unlockCardAction } from "./gate-actions";

// Tarjeta BLOQUEADA de la búsqueda de talento (estilo Tinder). Los datos que
// recibe ya vienen anonimizados del servidor: el blur es solo estética, no
// esconde información real.
export default function LockedTalentCard({
  candidate,
  freeLeft,
  resetAt,
  saldo,
}: {
  candidate: LockedTalentVM;
  freeLeft: number;
  resetAt: string | null;
  saldo: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [popup, setPopup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function desbloquear() {
    setError(null);
    startTransition(async () => {
      const res = await unlockCardAction(candidate.id);
      if (!res.ok) {
        if (res.code === "SIN_CUPO") {
          router.refresh();
          return;
        }
        setError(res.error ?? "No se pudo desbloquear.");
        return;
      }
      router.refresh();
    });
  }

  const horaReset = resetAt
    ? new Date(resetAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <li className="card relative overflow-hidden flex flex-col gap-3">
      {/* Contenido anonimizado y desenfocado */}
      <div className="blur-sm select-none pointer-events-none" aria-hidden>
        <div className="h-card">{candidate.initials}</div>
        <div className="eyebrow mt-1">{candidate.location || "Sin ubicación"}</div>
        <div className="divider my-3" />
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="font-mono text-lg">{candidate.competencyCount}</div>
            <div className="eyebrow" style={{ fontSize: "9px" }}>Compet.</div>
          </div>
          <div>
            <div className="font-mono text-lg">{candidate.coursesCompleted}</div>
            <div className="eyebrow" style={{ fontSize: "9px" }}>Formado</div>
          </div>
          <div>
            <div className="font-mono text-lg">{candidate.coursesInProgress}</div>
            <div className="eyebrow" style={{ fontSize: "9px" }}>En curso</div>
          </div>
        </div>
      </div>

      {/* Overlay de desbloqueo */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[color:var(--color-paper)]/70 p-4 text-center">
        {freeLeft > 0 ? (
          <>
            <span className="eyebrow">Perfil bloqueado</span>
            <button
              type="button"
              onClick={desbloquear}
              disabled={pending}
              className="btn-solid text-xs"
            >
              {pending ? "Desbloqueando…" : `Desbloquear (te quedan ${freeLeft})`}
            </button>
          </>
        ) : (
          <>
            <span className="eyebrow">No te quedan desbloqueos</span>
            {horaReset && (
              <p className="text-xs text-[color:var(--color-ink-soft)]">
                Se recargan a las {horaReset}.
              </p>
            )}
            <button
              type="button"
              onClick={() => setPopup(true)}
              className="btn-ghost text-xs"
            >
              Comprar SkillPoints
            </button>
          </>
        )}
        {error && <p className="text-xs text-[color:var(--color-mute)]">{error}</p>}
      </div>

      <WhatsAppTopupDialog
        abierto={popup}
        onClose={() => setPopup(false)}
        saldo={saldo}
        coste={0}
        mensaje="Hola, quiero desbloquear perfiles de talento en RECONNECTIA y quiero comprar SkillPoints."
      />
    </li>
  );
}
