export function CapacityMeter({ registered, capacity }: { registered: number; capacity: number }) {
  const percent = capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : 0;
  const tone = percent >= 95 ? "bg-rose-500" : percent >= 75 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{registered}/{capacity}</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
