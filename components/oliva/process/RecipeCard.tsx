export function RecipeCard() {
  return (
    <div className="flex min-h-[180px] items-center justify-center px-2">
      <div className="oliva-process-recipe w-full max-w-[200px] overflow-hidden rounded-2xl border border-[#eae8e3] bg-white shadow-[0_16px_32px_-20px_rgba(27,28,25,0.22)]">
        <div className="h-24 w-full bg-gradient-to-br from-[#b2ac88]/50 via-[#e9967a]/25 to-[#f5f3ee]" />
        <div className="space-y-2 p-3.5">
          <p className="text-sm font-semibold leading-tight text-[#1b1c19]">
            Bowl Mediterráneo
          </p>
          <p className="text-[11px] text-[#86736d]">12 minutos · 28g proteína</p>
          <div className="flex items-center gap-0.5 text-[11px] text-[#C49520]" aria-label="4 de 5">
            <span>★</span>
            <span>★</span>
            <span>★</span>
            <span>★</span>
            <span className="text-[#d9d2c4]">☆</span>
          </div>
          <div className="inline-flex rounded-full bg-[#3E5A3A] px-3 py-1.5 text-[11px] font-semibold text-white">
            Ver receta
          </div>
        </div>
      </div>
    </div>
  );
}
