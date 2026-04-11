"use client";

import { KeyId } from "../lib/clarinet-fingerings";

interface ClarinetSVGProps {
  activeKeys: KeyId[];
  noteName?: string;
}

interface HoleDef {
  id: KeyId;
  cx: number;
  cy: number;
  r: number;
  label: string;
  type: "hole" | "key";
}

const HOLES: HoleDef[] = [
  // Left hand – top of instrument
  { id: "LH_REG",   cx: 32, cy: 60,  r: 6,  label: "Reg", type: "key" },
  { id: "LH_THUMB", cx: 55, cy: 80,  r: 12, label: "T",   type: "hole" },
  { id: "LH_A",     cx: 32, cy: 115, r: 6,  label: "A",   type: "key" },
  { id: "LH_1",     cx: 55, cy: 140, r: 12, label: "1",   type: "hole" },
  { id: "LH_Eb",    cx: 32, cy: 170, r: 6,  label: "Eb",  type: "key" },
  { id: "LH_2",     cx: 55, cy: 200, r: 12, label: "2",   type: "hole" },
  { id: "LH_Ab",    cx: 32, cy: 230, r: 6,  label: "G#",  type: "key" },
  { id: "LH_3",     cx: 55, cy: 260, r: 12, label: "3",   type: "hole" },

  // Right hand – lower portion
  { id: "RH_B",     cx: 32, cy: 310, r: 6,  label: "B",   type: "key" },
  { id: "RH_1",     cx: 55, cy: 340, r: 12, label: "1",   type: "hole" },
  { id: "RH_Eb",    cx: 32, cy: 370, r: 6,  label: "Eb",  type: "key" },
  { id: "RH_2",     cx: 55, cy: 400, r: 12, label: "2",   type: "hole" },
  { id: "RH_3",     cx: 55, cy: 460, r: 12, label: "3",   type: "hole" },

  // Pinky keys (bottom)
  { id: "RH_E",      cx: 35, cy: 510, r: 7,  label: "E",   type: "key" },
  { id: "RH_F",      cx: 55, cy: 530, r: 7,  label: "F",   type: "key" },
  { id: "RH_Fsharp", cx: 75, cy: 510, r: 7,  label: "F#",  type: "key" },
];

export default function ClarinetSVG({ activeKeys, noteName }: ClarinetSVGProps) {
  const isActive = (id: KeyId) => activeKeys.includes(id);

  return (
    <div className="flex flex-col items-center">
      {/* Note display */}
      <div className="mb-2 h-10 flex items-center justify-center">
        {noteName && (
          <span className="text-2xl font-bold text-amber-400 tracking-wider">
            {noteName}
          </span>
        )}
      </div>

      <svg
        viewBox="0 0 110 600"
        width="110"
        height="600"
        className="drop-shadow-lg"
      >
        {/* Instrument body */}
        {/* Mouthpiece / barrel */}
        <path
          d="M45,10 Q45,0 55,0 Q65,0 65,10 L65,45 Q67,50 67,55 L67,70 L43,70 L43,55 Q43,50 45,45 Z"
          fill="#2a2a2a"
          stroke="#444"
          strokeWidth="1"
        />

        {/* Upper joint */}
        <rect x="40" y="70" width="30" height="220" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="1" />

        {/* Tenon joint ring */}
        <rect x="38" y="288" width="34" height="6" rx="2" fill="#666" />

        {/* Lower joint */}
        <rect x="40" y="294" width="30" height="200" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="1" />

        {/* Bell flare */}
        <path
          d="M40,494 Q38,520 30,560 Q28,575 35,585 Q45,595 55,595 Q65,595 75,585 Q82,575 80,560 Q72,520 70,494"
          fill="#1a1a1a"
          stroke="#333"
          strokeWidth="1"
        />
        {/* Bell ring */}
        <ellipse cx="55" cy="588" rx="22" ry="6" fill="none" stroke="#777" strokeWidth="1.5" />

        {/* Silver key rods (decorative) */}
        <line x1="35" y1="95" x2="35" y2="275" stroke="#555" strokeWidth="1.5" />
        <line x1="35" y1="300" x2="35" y2="490" stroke="#555" strokeWidth="1.5" />

        {/* Separator labels */}
        <text x="90" y="90" fontSize="8" fill="#666" fontFamily="sans-serif">LH</text>
        <text x="90" y="340" fontSize="8" fill="#666" fontFamily="sans-serif">RH</text>

        {/* Tone holes and keys */}
        {HOLES.map((hole) => {
          const active = isActive(hole.id);
          const isHole = hole.type === "hole";

          return (
            <g key={hole.id}>
              {/* Glow effect when active */}
              {active && (
                <circle
                  cx={hole.cx}
                  cy={hole.cy}
                  r={hole.r + 6}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="2"
                  opacity="0.5"
                >
                  <animate
                    attributeName="opacity"
                    values="0.3;0.7;0.3"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {isHole ? (
                // Tone hole (circle)
                <circle
                  cx={hole.cx}
                  cy={hole.cy}
                  r={hole.r}
                  fill={active ? "#facc15" : "#111"}
                  stroke={active ? "#fbbf24" : "#555"}
                  strokeWidth={active ? 2 : 1.5}
                  className="transition-all duration-150"
                />
              ) : (
                // Key (rounded rect)
                <rect
                  x={hole.cx - hole.r}
                  y={hole.cy - hole.r}
                  width={hole.r * 2}
                  height={hole.r * 2}
                  rx={3}
                  fill={active ? "#facc15" : "#333"}
                  stroke={active ? "#fbbf24" : "#555"}
                  strokeWidth={active ? 2 : 1}
                  className="transition-all duration-150"
                />
              )}

              {/* Label */}
              <text
                x={hole.cx}
                y={hole.cy + (isHole ? 4 : 3)}
                textAnchor="middle"
                fontSize={isHole ? 10 : 7}
                fill={active ? "#000" : "#999"}
                fontFamily="sans-serif"
                fontWeight={active ? "bold" : "normal"}
                className="select-none pointer-events-none"
              >
                {hole.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
