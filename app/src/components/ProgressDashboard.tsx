"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

interface DailyStat {
  day: string;
  count: number;
  successRate: number;
}

export default function ProgressDashboard() {
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);
        } else {
          setError(data.message || "Failed to load stats");
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  const labels = stats.map((s) => s.day);
  const counts = stats.map((s) => s.count);
  const rates = stats.map((s) => Math.round(s.successRate * 100));

  const data = {
    labels,
    datasets: [
      {
        label: "Reviews",
        data: counts,
        borderColor: "rgb(59,130,246)",
        backgroundColor: "rgba(59,130,246,0.2)",
        yAxisID: "y",
      },
      {
        label: "Success %",
        data: rates,
        borderColor: "rgb(34,197,94)",
        backgroundColor: "rgba(34,197,94,0.2)",
        yAxisID: "y1",
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      y: { beginAtZero: true, position: "left" as const },
      y1: {
        beginAtZero: true,
        position: "right" as const,
        grid: { drawOnChartArea: false },
        ticks: {
          callback: (val: number | string) => `${val}%`,
        },
      },
    },
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Line options={options} data={data} />
    </div>
  );
}

