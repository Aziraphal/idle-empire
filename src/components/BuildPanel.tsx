import { trpc } from "@/lib/trpc";
import { BUILDING_DATA, getBuildingUpgradeCost, TECHNOLOGY_DATA } from "@/lib/timer-service";
import { ResourceType } from "@prisma/client";
import { useState } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";

interface BuildPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const RESOURCE_ICONS = {
  gold: "🪙",
  food: "🌾", 
  stone: "🪨",
  iron: "⚔️",
  population: "👥",
  influence: "⭐",
};

const BUILDING_ICONS = {
  FARM: "🌾",
  MINE: "⛏️", 
  QUARRY: "🪨",
  BARRACKS: "🏰",
  MARKETPLACE: "🏪",
  ACADEMY: "📚",
};

const BUILDING_DESCRIPTIONS = {
  FARM: "Produces food for your population",
  MINE: "Extracts gold and iron from the earth", 
  QUARRY: "Provides stone for construction",
  BARRACKS: "Trains military units and generates influence",
  MARKETPLACE: "Boosts trade and gold production",
  ACADEMY: "Enables research and advanced technologies",
};

export default function BuildPanel({ isOpen, onClose }: BuildPanelProps) {
  const [activeTab, setActiveTab] = useState<'buildings' | 'research'>('buildings');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  
  // Handle click outside to close panel
  const panelRef = useClickOutside<HTMLDivElement>(onClose, isOpen);
  
  const { data: productionSummary, refetch: refetchProduction } = trpc.empire.getProductionSummary.useQuery();
  const { data: tasks, refetch: refetchTasks } = trpc.construction.getTasks.useQuery();
  
  const startConstructionMutation = trpc.construction.startConstruction.useMutation({
    onSuccess: () => {
      refetchProduction();
      refetchTasks();
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const startResearchMutation = trpc.technologies.startResearch.useMutation({
    onSuccess: () => {
      refetchProduction();
      refetchTasks();
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  if (!isOpen || !productionSummary || !tasks) return null;

  // Get first province for now (in future, user can select)
  const firstProvince = tasks.provinces[0];
  const province = selectedProvince ? 
    tasks.provinces.find(p => p.id === selectedProvince) : 
    firstProvince;

  if (!province) return null;

  // Get current resource stocks for selected province
  const currentResources: Record<string, number> = {};
  Object.entries(productionSummary.resources).forEach(([resource, amount]) => {
    currentResources[resource.toLowerCase()] = amount;
  });

  // Get current buildings for selected province
  const currentBuildings: Record<string, number> = {};
  province.buildings.forEach((building) => {
    currentBuildings[building.type] = building.level;
  });

  // Get active constructions for selected province
  const activeConstructions = province.constructions.map(c => c.buildingType);

  const handleStartConstruction = (buildingType: string) => {
    if (!province) return;
    
    startConstructionMutation.mutate({
      provinceId: province.id,
      buildingType,
    });
  };

  const handleStartResearch = (techKey: string) => {
    startResearchMutation.mutate({
      techKey,
    });
  };

  const canAfford = (cost: Record<string, number>): boolean => {
    return Object.entries(cost).every(([resource, amount]) => {
      const available = currentResources[resource] || 0;
      return available >= amount;
    });
  };

  const formatCost = (cost: Record<string, number>): string => {
    return Object.entries(cost)
      .map(([resource, amount]) => {
        const icon = RESOURCE_ICONS[resource as keyof typeof RESOURCE_ICONS];
        const available = currentResources[resource] || 0;
        const affordable = available >= amount;
        return `${icon}${amount}${!affordable ? ' ❌' : ''}`;
      })
      .join(' ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div ref={panelRef} className="bg-stone-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-empire-gold">🏗️ Build & Upgrade</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Province Selector */}
        {tasks.provinces.length > 1 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Select Province</h3>
            <div className="flex gap-2">
              {tasks.provinces.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvince(p.id)}
                  className={`px-4 py-2 rounded ${
                    province.id === p.id
                      ? 'bg-empire-gold text-stone-900'
                      : 'bg-stone-700 hover:bg-stone-600'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setActiveTab('buildings')}
            className={`px-6 py-3 rounded-t-lg ${
              activeTab === 'buildings'
                ? 'bg-empire-gold text-stone-900'
                : 'bg-stone-700 hover:bg-stone-600'
            }`}
          >
            🏗️ Buildings
          </button>
          <button
            onClick={() => setActiveTab('research')}
            className={`px-6 py-3 rounded-t-lg ${
              activeTab === 'research'
                ? 'bg-empire-gold text-stone-900'
                : 'bg-stone-700 hover:bg-stone-600'
            }`}
          >
            🔬 Research
          </button>
        </div>

        {/* Buildings Tab */}
        {activeTab === 'buildings' && (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Province: {province.name}</h3>
              <p className="text-stone-300 text-sm">
                Build new structures or upgrade existing ones to improve production and unlock new capabilities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(BUILDING_DATA).map(([buildingType, data]) => {
                const currentLevel = currentBuildings[buildingType] || 0;
                const isUnderConstruction = activeConstructions.includes(buildingType);
                const { cost, time } = getBuildingUpgradeCost(buildingType, currentLevel);
                const affordable = canAfford(cost);
                const icon = BUILDING_ICONS[buildingType as keyof typeof BUILDING_ICONS];
                const description = BUILDING_DESCRIPTIONS[buildingType as keyof typeof BUILDING_DESCRIPTIONS];

                return (
                  <div key={buildingType} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <h4 className="font-semibold capitalize">
                            {buildingType.toLowerCase()}
                          </h4>
                          <div className="text-sm text-stone-400">
                            Level {currentLevel}
                            {currentLevel > 0 && (
                              <span className="text-empire-gold"> → {currentLevel + 1}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-stone-300">
                          {time < 1 ? `${Math.round(time * 60)}m` : `${time.toFixed(1)}h`}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-stone-300 mb-3">{description}</p>

                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">Cost:</div>
                      <div className="text-sm">{formatCost(cost)}</div>
                    </div>

                    <button
                      onClick={() => handleStartConstruction(buildingType)}
                      disabled={!affordable || isUnderConstruction || startConstructionMutation.isLoading}
                      className={`w-full py-2 px-4 rounded font-medium ${
                        isUnderConstruction
                          ? 'bg-yellow-600 text-yellow-100 cursor-not-allowed'
                          : affordable
                          ? 'btn-primary'
                          : 'bg-stone-600 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {isUnderConstruction
                        ? '🚧 Under Construction'
                        : currentLevel === 0
                        ? 'Build'
                        : 'Upgrade'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Research Tab */}
        {activeTab === 'research' && (
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Technology Research</h3>
              <p className="text-stone-300 text-sm">
                Research new technologies to unlock powerful empire-wide bonuses and advanced buildings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(TECHNOLOGY_DATA).map(([techKey, tech]) => {
                const isResearching = tasks.researches.some(r => r.techKey === techKey);
                const affordable = canAfford(tech.cost);
                const timeStr = tech.researchTime < 1 ? 
                  `${Math.round(tech.researchTime * 60)}m` : 
                  `${tech.researchTime.toFixed(1)}h`;

                return (
                  <div key={techKey} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{tech.name}</h4>
                        <div className="text-sm text-stone-400">
                          Research Time: {timeStr}
                        </div>
                      </div>
                      <span className="text-2xl">🔬</span>
                    </div>

                    <p className="text-sm text-stone-300 mb-3">{tech.description}</p>

                    <div className="mb-3">
                      <div className="text-sm text-green-400 italic">
                        {tech.effects.description}
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">Cost:</div>
                      <div className="text-sm">{formatCost(tech.cost)}</div>
                    </div>

                    {tech.prerequisites && tech.prerequisites.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium mb-1 text-red-300">Prerequisites:</div>
                        <div className="text-sm text-red-200">
                          {tech.prerequisites.map(prereq => 
                            TECHNOLOGY_DATA[prereq]?.name || prereq
                          ).join(', ')}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleStartResearch(techKey)}
                      disabled={!affordable || isResearching || startResearchMutation.isLoading}
                      className={`w-full py-2 px-4 rounded font-medium ${
                        isResearching
                          ? 'bg-blue-600 text-blue-100 cursor-not-allowed'
                          : affordable
                          ? 'btn-primary'
                          : 'bg-stone-600 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {isResearching ? '🔬 Researching...' : 'Start Research'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Current Resources Display */}
        <div className="mt-6 pt-4 border-t border-stone-600">
          <h4 className="font-semibold mb-2">Available Resources:</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            {Object.entries(currentResources).map(([resource, amount]) => {
              const icon = RESOURCE_ICONS[resource as keyof typeof RESOURCE_ICONS];
              return (
                <div key={resource} className="flex items-center gap-1">
                  <span>{icon}</span>
                  <span>{amount.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}