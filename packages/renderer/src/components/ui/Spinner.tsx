import clsx from "clsx";

type SpinnerSize = "sm" | "md" | "lg";

const SIZE_CLASS = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={clsx(
        "rounded-full border-primary border-t-transparent animate-spin",
        SIZE_CLASS[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
