export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div aria-hidden className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-display font-extrabold text-sm">RC</div>
      <div className="leading-tight">
        <div className="font-display font-bold text-[15px]">Discovery Studio</div>
        <div className="text-[11px] text-muted-foreground">CPQ → Revenue Cloud migration</div>
      </div>
    </div>
  );
}
