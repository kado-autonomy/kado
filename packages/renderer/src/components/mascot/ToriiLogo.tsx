import clsx from "clsx";

interface ToriiLogoProps {
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
}

const SIZE_MAP = { xsm: 24, sm: 48, md: 80, lg: 120 };

const TORII_COLOR = "#74C365";
const TORII_DARK = "#5FA352";

export function ToriiLogo({
  size = "md",
  animated = false,
  className,
}: ToriiLogoProps) {
  const dim = SIZE_MAP[size];

  return (
    <div
      className={clsx("inline-flex items-center justify-center", className)}
      style={{ width: dim, height: dim }}
    >
      <svg viewBox="0 0 120 120" width={dim} height={dim}>
        <defs>
          <linearGradient id="torii-pillar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={TORII_COLOR} />
            <stop offset="50%" stopColor="#82D470" />
            <stop offset="100%" stopColor={TORII_COLOR} />
          </linearGradient>
          <linearGradient id="torii-beam" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#82D470" />
            <stop offset="100%" stopColor={TORII_DARK} />
          </linearGradient>
          <clipPath id="wind-clip">
            <rect x="10" y="25" width="100" height="90" />
          </clipPath>
        </defs>

        {/* Left pillar */}
        <rect x="28" y="32" width="8" height="78" rx="2" fill="url(#torii-pillar)" />
        {/* Right pillar */}
        <rect x="84" y="32" width="8" height="78" rx="2" fill="url(#torii-pillar)" />

        {/* Pillar bases */}
        <rect x="24" y="105" width="16" height="5" rx="2" fill={TORII_DARK} />
        <rect x="80" y="105" width="16" height="5" rx="2" fill={TORII_DARK} />

        {/* Lower crossbeam (nuki) */}
        <rect x="22" y="42" width="76" height="6" rx="2" fill={TORII_COLOR} />

        {/* Upper crossbeam (kasagi) - curved top */}
        <path
          d="M8 28 Q12 18 20 22 L100 22 Q108 18 112 28 L108 34 Q104 30 100 32 L20 32 Q16 30 12 34 Z"
          fill="url(#torii-beam)"
        />

        {/* Center tablet (gakuzuka) */}
        <rect x="48" y="30" width="24" height="14" rx="2" fill={TORII_DARK} />
        <rect x="50" y="32" width="20" height="10" rx="1" fill={TORII_COLOR} />

        {/* Wind — curled stream style */}
        {animated && (
          <g clipPath="url(#wind-clip)">
            {/* Stream group 1 — top curl (curls upward) */}
            <g className="animate-[torii-wind-1_4s_ease-in-out_infinite]">
              {/* Main line with upward curl at end */}
              <path
                d="M-40 58 L0 58 C8 58 14 56 16 52 C18 48 14 45 10 47"
                stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round"
              />
              {/* Trailing dash */}
              <path d="M-52 58 L-46 58" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              {/* Short accent dash below */}
              <path d="M-30 63 L-10 63" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </g>

            {/* Stream group 2 — middle curl (curls upward) */}
            <g className="animate-[torii-wind-2_5s_ease-in-out_infinite]">
              {/* Main line with upward curl at end */}
              <path
                d="M-55 76 L-5 76 C3 76 9 74 11 70 C13 66 9 63 5 65"
                stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" fill="none" strokeLinecap="round"
              />
              {/* Trailing dashes */}
              <path d="M-72 76 L-62 76" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M-80 76 L-76 76" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              {/* Short accent dash above */}
              <path d="M-40 71 L-18 71" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </g>

            {/* Stream group 3 — bottom curl (curls upward) */}
            <g className="animate-[torii-wind-3_6s_ease-in-out_infinite]">
              {/* Main line with upward curl */}
              <path
                d="M-45 93 L5 93 C13 93 19 91 21 87 C23 83 19 80 15 82"
                stroke="rgba(255,255,255,0.35)" strokeWidth="1.3" fill="none" strokeLinecap="round"
              />
              {/* Trailing dash */}
              <path d="M-58 93 L-50 93" stroke="rgba(255,255,255,0.2)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
              {/* Short accent */}
              <path d="M-35 98 L-15 98" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" strokeLinecap="round" />
            </g>
          </g>
        )}
      </svg>

      <style>{`
        @keyframes torii-wind-1 {
          0% { transform: translateX(-10px); opacity: 0; }
          12% { opacity: 1; }
          78% { opacity: 1; }
          100% { transform: translateX(130px); opacity: 0; }
        }
        @keyframes torii-wind-2 {
          0% { transform: translateX(-10px); opacity: 0; }
          15% { opacity: 1; }
          75% { opacity: 1; }
          100% { transform: translateX(130px); opacity: 0; }
        }
        @keyframes torii-wind-3 {
          0% { transform: translateX(-10px); opacity: 0; }
          18% { opacity: 1; }
          72% { opacity: 1; }
          100% { transform: translateX(130px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
