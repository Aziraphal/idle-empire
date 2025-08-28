import { trpc } from "@/lib/trpc";
import { formatRemainingTime, TECHNOLOGY_DATA } from "@/lib/timer-service";
import { useEffect, useState } from "react";

export default function TasksPanel() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data: tasks, refetch } = trpc.construction.getTasks.useQuery();

  // Update current time every minute for countdown display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  if (!tasks) return null;

  const allConstructions = tasks.provinces.flatMap((p) => 
    p.constructions.map((c) => ({ ...c, provinceName: p.name }))
  );
  const allResearches = tasks.researches;

  if (allConstructions.length === 0 && allResearches.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">⏱️ Active Tasks</h3>
        <p className="text-stone-400 text-center py-4">
          No construction or research in progress.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">⏱️ Active Tasks</h3>
        <button
          onClick={() => refetch()}
          className="text-sm text-empire-gold hover:text-empire-bronze"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="space-y-3">
        {/* Construction Tasks */}
        {allConstructions.map((construction) => {
          const remaining = formatRemainingTime(construction.finishesAt, currentTime);
          const isComplete = remaining === "Complete!";
          
          return (
            <div
              key={construction.id}
              className={`p-3 rounded-lg border ${
                isComplete 
                  ? "bg-green-900 border-green-600" 
                  : "bg-stone-700 border-stone-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    🏗️ {construction.buildingType.toLowerCase()} Level {construction.targetLevel}
                  </div>
                  <div className="text-sm text-stone-300">
                    {construction.provinceName}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${isComplete ? "text-green-400" : "text-empire-gold"}`}>
                    {remaining}
                  </div>
                  {isComplete && (
                    <div className="text-xs text-green-300">
                      Ready to collect!
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Research Tasks */}
        {allResearches.map((research) => {
          const tech = TECHNOLOGY_DATA[research.techKey];
          const remaining = formatRemainingTime(research.finishesAt, currentTime);
          const isComplete = remaining === "Complete!";
          
          return (
            <div
              key={research.id}
              className={`p-3 rounded-lg border ${
                isComplete 
                  ? "bg-green-900 border-green-600" 
                  : "bg-blue-900 border-blue-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    🔬 {tech?.name || research.techKey}
                  </div>
                  <div className="text-sm text-stone-300">
                    {tech?.description || "Research in progress"}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${isComplete ? "text-green-400" : "text-blue-400"}`}>
                    {remaining}
                  </div>
                  {isComplete && (
                    <div className="text-xs text-green-300">
                      Research complete!
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(allConstructions.some(c => formatRemainingTime(c.finishesAt, currentTime) === "Complete!") ||
        allResearches.some(r => formatRemainingTime(r.finishesAt, currentTime) === "Complete!")) && (
        <div className="mt-4 text-center">
          <p className="text-green-400 text-sm mb-2">
            ✨ Some tasks are complete! Refresh to collect rewards.
          </p>
        </div>
      )}
    </div>
  );
}