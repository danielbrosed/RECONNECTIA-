import Link from "next/link";
import type { TalentCardVM } from "@/lib/empresa/talento";
import InviteButton from "./InviteButton";

export default function TalentCard({
  candidate,
  jobs,
}: {
  candidate: TalentCardVM;
  jobs: { id: string; title: string }[];
}) {
  return (
    <li className="card flex flex-col gap-3">
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
        {candidate.coursesCompleted > 0 && (
          <span className="text-[10px] font-mono px-2 py-1 border border-[color:var(--color-ink)] uppercase whitespace-nowrap">
            {candidate.coursesCompleted} formación{candidate.coursesCompleted === 1 ? "" : "es"}
          </span>
        )}
      </div>

      {candidate.headline && (
        <p className="text-sm text-[color:var(--color-ink-soft)] line-clamp-2">{candidate.headline}</p>
      )}

      {candidate.competencies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {candidate.competencies.slice(0, 4).map((c) => (
            <span
              key={c.name}
              className={`text-xs font-mono px-2 py-0.5 border ${
                c.validatedByEcoe
                  ? "border-[color:var(--color-ink)] bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                  : "border-[color:var(--color-line)]"
              }`}
            >
              {c.name}
              {c.validatedByEcoe ? " · Ecoe" : ""}
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
      <InviteButton studentId={candidate.id} studentName={candidate.name} jobs={jobs} compact />
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
