// Tarjeta KPI reutilizable de las vistas de empresa (extraída del patrón de
// candidatos/[id] y trabajadores).
export default function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="eyebrow">{label}</div>
      <div className="h-card mt-2">{value}</div>
    </div>
  );
}
