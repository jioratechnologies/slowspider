import { cn } from "@/lib/utils";

export function DotPattern({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      aria-hidden
      style={{
        backgroundImage: "radial-gradient(color-mix(in srgb, var(--ink3) 45%, transparent) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 85%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 85%)",
        opacity: 0.5,
      }}
    />
  );
}
