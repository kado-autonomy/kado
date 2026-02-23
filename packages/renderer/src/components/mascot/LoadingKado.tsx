import { KadoMascot } from "./KadoMascot";

interface LoadingKadoProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingKado({
  message = "Kado is thinking...",
  size = "md",
  className,
}: LoadingKadoProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 p-6 ${className ?? ""}`}
    >
      <KadoMascot size={size} mood="thinking" animated />
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm text-muted-foreground-2">{message}</span>
        <span className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-primary animate-[pulse_1.4s_ease-in-out_infinite]" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary animate-[pulse_1.4s_ease-in-out_infinite]" style={{ animationDelay: "200ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary animate-[pulse_1.4s_ease-in-out_infinite]" style={{ animationDelay: "400ms" }} />
        </span>
      </div>
    </div>
  );
}
