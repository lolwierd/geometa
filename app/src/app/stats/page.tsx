import ProgressDashboard from "@/components/ProgressDashboard";

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Review Stats</h1>
      <ProgressDashboard />
    </div>
  );
}

