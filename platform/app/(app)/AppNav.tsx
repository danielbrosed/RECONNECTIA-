"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/roles";
import { NAV_BY_ROLE, activeArea, isTabActive } from "@/lib/nav";

// Navegación 100% VISIBLE: nada de desplegables. Si el rol tiene >1 área, se
// muestran todas las áreas (fila de "pills") y debajo las pestañas del área
// activa. Todo se ajusta en varias líneas (flex-wrap) → ningún destino queda
// escondido tras un menú ni recortado por scroll.
export default function AppNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const areas = NAV_BY_ROLE[role] ?? [];
  const area = activeArea(areas, pathname);
  if (!area) return null;

  // Si el área activa solo tiene una pestaña que ES su propio basePath, la fila
  // de pestañas sería redundante con el pill del área → no se muestra.
  const showTabs = !(area.tabs.length === 1 && area.tabs[0].href === area.basePath);

  return (
    <div className="px-4 sm:px-12 pb-1">
      {areas.length > 1 && (
        <div className="flex flex-wrap gap-1.5 py-2">
          {areas.map((a) => {
            const active = a.key === area.key;
            return (
              <Link
                key={a.key}
                href={a.basePath}
                className={`px-3 py-1.5 text-sm border transition-colors whitespace-nowrap ${
                  active
                    ? "border-[color:var(--color-ink)] bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                    : "border-[color:var(--color-line)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]"
                }`}
              >
                {a.label}
              </Link>
            );
          })}
        </div>
      )}
      {showTabs && (
        <nav className="flex flex-wrap gap-x-1 gap-y-0.5">
          {area.tabs.map((tab) => {
            const active = isTabActive(tab, area, pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  active
                    ? "border-[color:var(--color-ink)] font-medium"
                    : "border-transparent text-[color:var(--color-mute)] hover:text-[color:var(--color-ink)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
