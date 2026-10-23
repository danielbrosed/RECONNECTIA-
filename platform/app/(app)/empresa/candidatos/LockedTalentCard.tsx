"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LockedTalentVM } from "@/lib/empresa/talento";
import CompraSkillPointsDialog from "@/lib/skp/CompraSkillPointsDialog";
import { useGuardado } from "@/app/_ui/useGuardado";
import { unlockCardAction, unlockFichaAction } from "./gate-actions";
import { ZonaGasto } from "@/app/_ui/ZonaGasto";

// Tarjeta BLOQUEADA de la búsqueda de talento (estilo Tinder). Los datos que
// recibe ya vienen anonimizados del servidor: el blur es solo estética, no
// esconde información real.
//
// LOTE02 (E2): las 3 primeras tarjetas son gratis UNA SOLA VEZ y nada se
// recarga solo. Agotadas, la tarjeta ofrece «Ver ficha por N SkillPoints» (el
// pago de ficha de siempre, 2 a 10 según el perfil); sin saldo, la compra por
// correo (G11, L5-16). Guardado común (useGuardado): un clic, una petición, sin
// transiciones propias.
// LOTE05-R (respuesta de Daniel a la decisión 11): desbloquear también con
// «Ver» en «Buscar talento» (antes solo con «Editar»).
function TarjetaBloqueada({
  candidate,
  freeLeft,
  saldo,
  mensajeCompra,
}: {
  candidate: LockedTalentVM;
  freeLeft: number;
  saldo: number;
  /** Correo de compra con el nombre y el CIF de la empresa (G11). */
  /** null: quien mira es una persona con un rol (arreglos del LOTE04, RA-10): no se le ofrece comprar. */
  mensajeCompra: string | null;
}) {
  const router = useRouter();
  const [popup, setPopup] = useState<{ coste: number; saldo: number } | null>(null);
  const tarjeta = useGuardado(() => unlockCardAction(candidate.id), {
    alGuardar: () => router.refresh(),
    alFallar: (r) => {
      if (r.code === "SIN_CUPO") router.refresh();
    },
    mensajeFallo: "No hay conexión. Inténtalo de nuevo.",
  });
  const ficha = useGuardado(() => unlockFichaAction(candidate.id), {
    alGuardar: () => router.push(`/empresa/candidatos/${candidate.id}`),
    alFallar: (r) => {
      if (r.code === "SIN_SALDO") setPopup({ coste: r.coste ?? candidate.precioFicha, saldo: r.saldo ?? saldo });
    },
    mensajeFallo: "No hay conexión. Inténtalo de nuevo.",
  });
  // Sin cupo, la tarjeta se refresca sola; sin saldo, sale la compra por correo: no son errores que enseñar.
  const sinCupo = tarjeta.resultado?.code === "SIN_CUPO";
  const sinSaldo = ficha.resultado?.code === "SIN_SALDO";
  const error = (sinCupo ? null : tarjeta.error) ?? (sinSaldo ? null : ficha.error);

  return (
    <li className="card relative overflow-hidden flex flex-col gap-3" data-tarjeta-bloqueada={candidate.id}>
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
        <span className="eyebrow">Perfil bloqueado</span>
        {freeLeft > 0 ? (
          <button
            type="button"
            onClick={() => void tarjeta.enviar(new FormData())}
            disabled={tarjeta.guardando}
            className="btn-solid text-xs"
            data-desbloquear-gratis
          >
            {tarjeta.guardando ? "Desbloqueando…" : `Desbloquear gratis (te quedan ${freeLeft})`}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void ficha.enviar(new FormData())}
            disabled={ficha.guardando}
            className="btn-solid text-xs"
            data-ver-ficha-pagando={candidate.precioFicha}
          >
            {ficha.guardando ? "Abriendo…" : `Ver ficha por ${candidate.precioFicha} SkillPoints`}
          </button>
        )}
        {error && <p className="text-xs text-[color:var(--color-mute)]">{error}</p>}
      </div>

      <CompraSkillPointsDialog
        abierto={popup !== null}
        onClose={() => setPopup(null)}
        saldo={popup?.saldo ?? saldo}
        coste={popup?.coste ?? candidate.precioFicha}
        mensaje={mensajeCompra}
      />
    </li>
  );
}

/**
 * LOTE05-R (respuesta de Daniel a la decisión 11): lo que gasta SkillPoints lo
 * hace también quien solo VE la sección: <ZonaGasto> devuelve a este bloque el
 * nivel «editar» (sus hooks envían); el servidor lo comprueba con «ver».
 */
export default function LockedTalentCard(props: Parameters<typeof TarjetaBloqueada>[0]) {
  return (
    <ZonaGasto>
      <TarjetaBloqueada {...props} />
    </ZonaGasto>
  );
}
