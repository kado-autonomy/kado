import clsx from "clsx";

type BadgeVariant = "default" | "success" | "error" | "warning" | "info";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  default: "bg-surface text-muted-foreground-2 border-line-2",
  success: "bg-kado-success/20 text-kado-success border-kado-success/40",
  error: "bg-destructive/20 text-destructive border-destructive/40",
  warning: "bg-kado-warning/20 text-kado-warning border-kado-warning/40",
  info: "bg-primary/20 text-primary border-primary/40",
};

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ text, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        VARIANT_CLASS[variant],
        className
      )}
    >
      {text}
    </span>
  );
}
