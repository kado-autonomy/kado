import clsx from "clsx";

export type KadoSize = "sm" | "md" | "lg";
export type KadoMood = "happy" | "thinking" | "working" | "error";

interface KadoMascotProps {
  size?: KadoSize;
  mood?: KadoMood;
  animated?: boolean;
  className?: string;
}

const SIZE_MAP = { sm: 48, md: 80, lg: 120 };

function getEyes(mood: KadoMood) {
  switch (mood) {
    case "happy":
      return (
        <>
          <ellipse cx="38" cy="42" rx="4" ry="5" fill="var(--foreground)" />
          <ellipse cx="62" cy="42" rx="4" ry="5" fill="var(--foreground)" />
          <ellipse cx="38" cy="43" rx="2" ry="2" fill="var(--background)" />
          <ellipse cx="62" cy="43" rx="2" ry="2" fill="var(--background)" />
        </>
      );
    case "thinking":
      return (
        <>
          <ellipse cx="36" cy="44" rx="3" ry="4" fill="var(--foreground)" transform="rotate(-15 36 44)" />
          <ellipse cx="64" cy="44" rx="3" ry="4" fill="var(--foreground)" transform="rotate(15 64 44)" />
        </>
      );
    case "working":
      return (
        <>
          <ellipse cx="38" cy="42" rx="4" ry="3" fill="var(--foreground)" />
          <ellipse cx="62" cy="42" rx="4" ry="3" fill="var(--foreground)" />
        </>
      );
    case "error":
      return (
        <>
          <path d="M34 40 L42 48 M42 40 L34 48" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" />
          <path d="M58 40 L66 48 M66 40 L58 48" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}

function getMouth(mood: KadoMood) {
  switch (mood) {
    case "happy":
      return <path d="M40 58 Q50 68 60 58" stroke="var(--foreground)" strokeWidth="2" fill="none" strokeLinecap="round" />;
    case "thinking":
      return <circle cx="50" cy="60" r="3" fill="var(--foreground)" />;
    case "working":
      return <path d="M42 58 L58 58" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" />;
    case "error":
      return <path d="M42 62 L58 62" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" />;
    default:
      return null;
  }
}

export function KadoMascot({
  size = "md",
  mood = "happy",
  animated = false,
  className,
}: KadoMascotProps) {
  const dim = SIZE_MAP[size];

  return (
    <div
      className={clsx(
        "inline-flex items-center justify-center",
        animated && "animate-[kado-wave_1.5s_ease-in-out_infinite]",
        className
      )}
      style={{ width: dim, height: dim }}
    >
      <svg
        viewBox="0 0 100 100"
        width={dim}
        height={dim}
        className={animated && mood === "happy" ? "animate-[kado-bounce_0.6s_ease-in-out_infinite]" : undefined}
      >
        <defs>
          <linearGradient id="kado-hair" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#74C365" />
            <stop offset="100%" stopColor="#5FA352" />
          </linearGradient>
          <linearGradient id="kado-outfit" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00416A" />
            <stop offset="100%" stopColor="#002E4A" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="none">
          <ellipse cx="50" cy="52" rx="32" ry="30" fill="#FAEBD7" stroke="#E8D5B7" strokeWidth="1" />
          <path
            d="M18 25 Q20 5 35 8 Q50 10 50 12 Q50 10 65 8 Q80 5 82 25 Q85 35 80 42 L80 50 Q78 55 75 52 L25 52 Q22 55 20 50 L20 42 Q15 35 18 25"
            fill="url(#kado-hair)"
            stroke="#4D8A43"
            strokeWidth="1"
          />
          <rect x="30" y="70" width="40" height="25" rx="4" fill="url(#kado-outfit)" stroke="#1A5C7E" strokeWidth="1" />
          <ellipse cx="35" cy="92" rx="6" ry="4" fill="#002E4A" />
          <ellipse cx="65" cy="92" rx="6" ry="4" fill="#002E4A" />
          <path
            d="M78 55 Q95 50 92 65 Q90 75 78 72 Z"
            fill="#FAEBD7"
            stroke="#E8D5B7"
            strokeWidth="1"
            className={animated && mood === "happy" ? "animate-[kado-wave-hand_1s_ease-in-out_infinite] origin-left" : undefined}
          />
          <g>{getEyes(mood)}</g>
          <g>{getMouth(mood)}</g>
        </g>
      </svg>
      <style>{`
        @keyframes kado-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes kado-wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        @keyframes kado-wave-hand {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(15deg); }
        }
      `}</style>
    </div>
  );
}
