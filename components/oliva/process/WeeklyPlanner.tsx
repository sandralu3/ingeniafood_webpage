const DAYS = [
  { day: "Lun", empty: true },
  { day: "Mar", empty: true },
  { day: "Mié", filled: true },
  { day: "Jue", empty: true }
] as const;

export function WeeklyPlanner() {
  return (
    <div className="flex min-h-[180px] items-center justify-center px-1">
      <div className="w-full max-w-[220px] rounded-2xl border border-[#eae8e3] bg-white p-3 shadow-[0_12px_28px_-18px_rgba(27,28,25,0.16)]">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#86736d]">
          Esta semana
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {DAYS.map((item) => (
            <div key={item.day} className="flex flex-col gap-1.5">
              <span className="text-center text-[9px] font-medium text-[#86736d]">
                {item.day}
              </span>
              <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-[#e4e2dd] bg-[#fbf9f4]">
                {"filled" in item && item.filled ? (
                  <div className="oliva-process-slot mx-1 w-full overflow-hidden rounded-lg border border-[#556B2F]/20 bg-[#556B2F]/10 px-1 py-1.5 text-center">
                    <p className="text-[8px] font-semibold leading-tight text-[#3E5A3A]">
                      Bowl Mediterráneo
                    </p>
                    <p className="mt-0.5 text-[7px] text-[#86736d]">12 min</p>
                  </div>
                ) : (
                  <span className="text-[9px] text-[#d9d2c4]">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
