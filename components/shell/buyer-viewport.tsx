import { cn } from "@/lib/formatting";

export function BuyerViewport({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("min-h-svh px-4 text-warm-text sm:px-5", className)}>
      <div className="phone-shell min-h-svh">{children}</div>
    </main>
  );
}
