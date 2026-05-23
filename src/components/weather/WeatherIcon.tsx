import { motion } from "framer-motion";

export function WeatherIcon({ code, size = 96 }: { code: string; size?: number }) {
  // OpenWeather icon codes: 01-50, d/n suffix
  const main = code?.slice(0, 2) ?? "01";
  const isNight = code?.endsWith("n");

  if (main === "01") return <Sunny size={size} night={isNight} />;
  if (main === "02" || main === "03" || main === "04") return <Cloudy size={size} />;
  if (main === "09" || main === "10") return <Rain size={size} />;
  if (main === "11") return <Storm size={size} />;
  if (main === "13") return <Snow size={size} />;
  if (main === "50") return <Fog size={size} />;
  return <Sunny size={size} night={isNight} />;
}

function Sunny({ size, night }: { size: number; night?: boolean }) {
  const color = night ? "#cbd5e1" : "#f59e0b";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "50px 50px" }}
      >
        {[...Array(8)].map((_, i) => (
          <rect
            key={i}
            x="48"
            y="6"
            width="4"
            height="14"
            rx="2"
            fill={color}
            transform={`rotate(${i * 45} 50 50)`}
          />
        ))}
      </motion.g>
      <motion.circle
        cx="50"
        cy="50"
        r="18"
        fill={color}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </svg>
  );
}

function Cloudy({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <motion.g
        animate={{ x: [-2, 2, -2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <ellipse cx="50" cy="55" rx="30" ry="16" fill="#94a3b8" />
        <ellipse cx="38" cy="48" rx="14" ry="12" fill="#cbd5e1" />
        <ellipse cx="62" cy="46" rx="16" ry="14" fill="#e2e8f0" />
      </motion.g>
    </svg>
  );
}

function Rain({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <ellipse cx="50" cy="40" rx="28" ry="14" fill="#64748b" />
      <ellipse cx="38" cy="34" rx="12" ry="10" fill="#94a3b8" />
      {[20, 40, 60, 80].map((x, i) => (
        <motion.line
          key={i}
          x1={x}
          y1="60"
          x2={x - 4}
          y2="78"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          animate={{ y: [0, 20, 0], opacity: [1, 0, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </svg>
  );
}

function Storm({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <ellipse cx="50" cy="38" rx="30" ry="15" fill="#475569" />
      <motion.polygon
        points="48,55 38,75 48,75 42,90 60,68 50,68 56,55"
        fill="#fbbf24"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    </svg>
  );
}

function Snow({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <ellipse cx="50" cy="38" rx="28" ry="14" fill="#cbd5e1" />
      {[25, 45, 65, 85].map((x, i) => (
        <motion.text
          key={i}
          x={x}
          y="70"
          fontSize="14"
          fill="#e0f2fe"
          animate={{ y: [60, 90], opacity: [1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
        >
          ❄
        </motion.text>
      ))}
    </svg>
  );
}

function Fog({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {[35, 50, 65, 80].map((y, i) => (
        <motion.rect
          key={i}
          x="10"
          y={y}
          width="80"
          height="4"
          rx="2"
          fill="#cbd5e1"
          animate={{ x: [-10, 10, -10] }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </svg>
  );
}
