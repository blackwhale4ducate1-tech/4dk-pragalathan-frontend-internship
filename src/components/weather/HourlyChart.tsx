import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export function HourlyChart({
  points,
  unit,
}: {
  points: Array<{ time: string; temp: number }>;
  unit: string;
}) {
  return (
    <Line
      data={{
        labels: points.map((p) => p.time),
        datasets: [
          {
            label: `Temp (${unit})`,
            data: points.map((p) => p.temp),
            borderColor: "rgb(59,130,246)",
            backgroundColor: "rgba(59,130,246,0.15)",
            tension: 0.4,
            fill: true,
            pointRadius: 3,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: "rgba(0,0,0,0.05)" } },
          x: { grid: { display: false } },
        },
      }}
    />
  );
}
