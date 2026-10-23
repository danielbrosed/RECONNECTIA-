import Link from "next/link";
import type { TalentCardVM } from "@/lib/empresa/talento";
import InviteButton from "./InviteButton";

/** LOTE02 (E3): icono de sobre abierto («Ficha desbloqueada»). */
export function SobreAbierto({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      role="img"
      aria-label="Ficha desbloqueada"
      className={className}
    >
      <title>Ficha desbloqueada</title>
      <path d="M3 10.5 12 4l9 6.5V20H3z" />
      <path d="m3 10.5 9 6 9-6" />
      <path d="M7 8.5V6h10v2.5" />
    </svg>
  );
}

export default function TalentCard({
  userId,
  candidate,
  jobs,
  fichaDesbloqueada = false,
}: {
  /** La empresa de la sesión (su borrador de invitación). */
  userId: string;
  candidate: TalentCardVM;
  jobs: { id: string; title: string }[];
  /** E3: la empresa ya pagó la ficha completa. */
  fichaDesbloqueada?: boolean;
}) {
  return (
    <li className="card flex flex-col gap-3" data-tarjeta-talento={candidate.id}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/empresa/candidatos/${candidate.id}`}
            className="h-card hover:underline block truncate"
          >
            {candidate.name}
          </Link>
          <div className="eyebrow mt-1">{candidate.location || "Sin ubicación"}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {fichaDesbloqueada && (
            <span title="Ficha desbloqueada" data-sobre-abierto>
              <SobreAbierto />
            </span>
          )}
          {candidate.coursesCompleted > 0 && (
            <span className="text-[10px] font-mono px-2 py-1 border border-[color:var(--color-ink)] uppercase whitespace-nowrap">
              {candidate.coursesCompleted} formación{candidate.coursesCompleted === 1 ? "" : "es"}
            </span>
          )}
        </div>
      </div>

      {candidate.headline && (
        <p className="text-sm text-[color:var(--color-ink-soft)] line-clamp-2">{candidate.headline}</p>
      )}

      {/* V0: competencias declaradas por el alumno; ninguna se marca como validada. */}
      {(candidate.competencies.length > 0 || candidate.languages.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {candidate.languages.slice(0, 2).map((l) => (
            <span key={l} className="text-xs font-mono px-2 py-0.5 border border-[color:var(--color-line)]">
              {l}
            </span>
          ))}
          {candidate.competencies.slice(0, 4).map((c) => (
            <span key={c.nombre} className="text-xs font-mono px-2 py-0.5 border border-[color:var(--color-line)]">
              {c.nombre}
            </span>
          ))}
        </div>
      )}

      <div className="divider !mt-auto" />
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat value={candidate.competencyCount} label="Compet." />
        <Stat value={candidate.coursesCompleted} label="Formado" />
        <Stat value={candidate.coursesInProgress} label="En curso" />
      </div>

      <div className="flex gap-2">
        <Link href={`/empresa/candidatos/${candidate.id}`} className="btn-ghost flex-1 justify-center text-xs">
          Ver perfil
        </Link>
      </div>
      {/* E3: quien ya está invitado no sale en la búsqueda; aquí siempre se puede invitar. */}
      <InviteButton userId={userId} studentId={candidate.id} studentName={candidate.name} jobs={jobs} compact />
    </li>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-mono text-lg" style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </div>
      <div className="eyebrow" style={{ fontSize: "9px" }}>
        {label}
      </div>
    </div>
  );
}
