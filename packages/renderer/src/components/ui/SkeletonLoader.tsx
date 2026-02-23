import clsx from "clsx";

type SkeletonVariant = "text" | "circle" | "rect";

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  variant?: SkeletonVariant;
  className?: string;
}

export function SkeletonLoader({
  width,
  height,
  variant = "rect",
  className,
}: SkeletonLoaderProps) {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={clsx(
        "relative overflow-hidden bg-surface",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        variant === "circle" && "rounded-full",
        variant === "text" && "rounded h-4",
        variant === "rect" && "rounded-md",
        className
      )}
      style={style}
    >
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
