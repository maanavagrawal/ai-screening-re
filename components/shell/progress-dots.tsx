export function ProgressDots({ active, total = 6 }: { active: number; total?: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className="block h-1.5 rounded-full transition-all duration-200"
          style={{
            width: index === active ? 18 : 6,
            background: index === active ? "var(--agent-accent)" : "var(--border)"
          }}
        />
      ))}
    </div>
  );
}
