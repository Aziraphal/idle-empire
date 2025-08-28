import { trpc } from "@/lib/trpc";
import { GovernorPersonality, ResourceType } from "@prisma/client";
import { useState } from "react";

interface ProvincesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const RESOURCE_ICONS = {
  GOLD: "🪙",
  FOOD: "🌾",
  STONE: "🪨",
  IRON: "⚔️", 
  POP: "👥",
  INFLUENCE: "⭐",
};

const PERSONALITY_ICONS: Record<GovernorPersonality, string> = {
  CONSERVATIVE: "🛡️",
  AGGRESSIVE: "⚔️",
  MERCHANT: "💰",
  EXPLORER: "🗺️",
};

const BUILDING_ICONS = {
  FARM: "🌾",
  MINE: "⛏️",
  QUARRY: "🪨", 
  BARRACKS: "🏰",
  MARKETPLACE: "🏪",
  ACADEMY: "📚",
};

export default function ProvincesPanel({ isOpen, onClose }: ProvincesPanelProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'resources' | 'buildings' | 'governors'>('overview');

  const { data: governorsData, refetch } = trpc.governors.getGovernors.useQuery();
  const { data: empireData } = trpc.empire.getProductionSummary.useQuery();
  const { data: constructionData } = trpc.construction.getTasks.useQuery();

  const startConstructionMutation = trpc.construction.startConstruction.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      alert(`Construction failed: ${error.message}`);
    },
  });

  if (!isOpen || !governorsData || !empireData || !constructionData) return null;

  const provinces = governorsData.provinces;

  const getTotalResources = () => {
    const totals: Record<string, number> = {};
    provinces.forEach(province => {
      Object.entries(province.resources).forEach(([resource, amount]) => {
        totals[resource] = (totals[resource] || 0) + amount;
      });
    });
    return totals;
  };

  const getTotalBuildings = () => {
    return provinces.reduce((sum, p) => sum + p.buildings.length, 0);
  };

  const getActiveConstructions = () => {
    return provinces.reduce((sum, p) => sum + p.constructions.length, 0);
  };

  const getGovernorStats = () => {
    const stats = {
      totalGovernors: 0,
      avgLoyalty: 0,
      avgExperience: 0,
      personalities: {} as Record<GovernorPersonality, number>,
    };

    provinces.forEach(province => {
      if (province.governor) {
        stats.totalGovernors++;
        stats.avgLoyalty += province.governor.loyalty;
        stats.avgExperience += province.governor.xp;
        
        const personality = province.governor.personality;
        stats.personalities[personality] = (stats.personalities[personality] || 0) + 1;
      }
    });

    if (stats.totalGovernors > 0) {
      stats.avgLoyalty = Math.round(stats.avgLoyalty / stats.totalGovernors);
      stats.avgExperience = Math.round(stats.avgExperience / stats.totalGovernors);
    }

    return stats;
  };

  const handleQuickBuild = (provinceId: string, buildingType: string) => {
    startConstructionMutation.mutate({
      provinceId,
      buildingType,
    });
  };

  const selectedProvinceData = selectedProvince ? 
    provinces.find(p => p.id === selectedProvince) : null;

  const totalResources = getTotalResources();
  const totalBuildings = getTotalBuildings();
  const activeConstructions = getActiveConstructions();
  const governorStats = getGovernorStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-stone-800 rounded-lg p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-empire-gold">🏛️ Empire Provinces</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-1 mb-6">
          {[
            { key: 'overview', label: '📊 Overview', icon: '📊' },
            { key: 'resources', label: '💰 Resources', icon: '💰' },
            { key: 'buildings', label: '🏗️ Buildings', icon: '🏗️' },
            { key: 'governors', label: '👨‍💼 Governors', icon: '👨‍💼' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key as any)}
              className={`px-4 py-2 rounded-t-lg ${
                viewMode === tab.key
                  ? 'bg-empire-gold text-stone-900'
                  : 'bg-stone-700 hover:bg-stone-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Mode */}
        {viewMode === 'overview' && (
          <div className="space-y-6">
            {/* Empire Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card text-center">
                <div className="text-2xl text-empire-gold font-bold">{provinces.length}</div>
                <div className="text-stone-400">Provinces</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl text-empire-gold font-bold">{totalBuildings}</div>
                <div className="text-stone-400">Total Buildings</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl text-empire-gold font-bold">{activeConstructions}</div>
                <div className="text-stone-400">Active Projects</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl text-empire-gold font-bold">{governorStats.totalGovernors}</div>
                <div className="text-stone-400">Governors</div>
              </div>
            </div>

            {/* Provinces Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {provinces.map(province => (
                <div key={province.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{province.name}</h3>
                    {province.governor && (
                      <div className="flex items-center gap-1 text-sm">
                        <span>{PERSONALITY_ICONS[province.governor.personality]}</span>
                        <span className="text-stone-400">{province.governor.loyalty}%</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    <div className="text-center">
                      <div className="text-empire-gold font-bold">{province.buildings.length}</div>
                      <div className="text-stone-400">Buildings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-empire-gold font-bold">{province.constructions.length}</div>
                      <div className="text-stone-400">Projects</div>
                    </div>
                    <div className="text-center">
                      <div className="text-empire-gold font-bold">
                        {Object.values(province.resources).reduce((sum, amount) => sum + amount, 0).toLocaleString()}
                      </div>
                      <div className="text-stone-400">Resources</div>
                    </div>
                  </div>

                  {/* Top Resources */}
                  <div className="mb-3">
                    <div className="text-xs text-stone-400 mb-1">Top Resources:</div>
                    <div className="flex gap-2 text-xs">
                      {Object.entries(province.resources)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 3)
                        .map(([resource, amount]) => (
                          <span key={resource} className="bg-stone-700 px-2 py-1 rounded">
                            {RESOURCE_ICONS[resource.toUpperCase() as ResourceType]} {amount}
                          </span>
                        ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedProvince(province.id)}
                    className="w-full btn-secondary text-sm"
                  >
                    📋 View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources Mode */}
        {viewMode === 'resources' && (
          <div className="space-y-6">
            {/* Total Resources Summary */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">💰 Empire Resource Summary</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {Object.entries(totalResources).map(([resource, amount]) => (
                  <div key={resource} className="text-center">
                    <div className="text-2xl mb-1">
                      {RESOURCE_ICONS[resource.toUpperCase() as ResourceType]}
                    </div>
                    <div className="text-lg font-bold text-empire-gold">
                      {amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-stone-400 capitalize">{resource}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-Province Resources */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {provinces.map(province => (
                <div key={province.id} className="card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <span>{province.name}</span>
                    {province.governor && (
                      <span className="text-sm text-stone-400">
                        ({PERSONALITY_ICONS[province.governor.personality]} {province.governor.name})
                      </span>
                    )}
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {Object.entries(province.resources).map(([resource, amount]) => (
                      <div key={resource} className="bg-stone-700 rounded p-2 text-center">
                        <div className="text-xs text-stone-400 mb-1">
                          {RESOURCE_ICONS[resource.toUpperCase() as ResourceType]}
                        </div>
                        <div className="font-medium">{amount.toLocaleString()}</div>
                        <div className="text-xs text-stone-400 capitalize">{resource}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buildings Mode */}
        {viewMode === 'buildings' && (
          <div className="space-y-6">
            {provinces.map(province => (
              <div key={province.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-lg">{province.name}</h4>
                  <div className="text-sm text-stone-400">
                    {province.buildings.length} buildings • {province.constructions.length} active projects
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current Buildings */}
                  <div>
                    <h5 className="font-medium mb-2">🏢 Current Buildings</h5>
                    {province.buildings.length > 0 ? (
                      <div className="space-y-2">
                        {province.buildings.map((building, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-stone-700 rounded p-2">
                            <div className="flex items-center gap-2">
                              <span>{BUILDING_ICONS[building.type as keyof typeof BUILDING_ICONS]}</span>
                              <span className="capitalize">{building.type.toLowerCase()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-empire-gold">Level {building.level}</span>
                              <button
                                onClick={() => handleQuickBuild(province.id, building.type)}
                                disabled={startConstructionMutation.isLoading}
                                className="btn-secondary text-xs px-2 py-1"
                              >
                                ⬆️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-stone-400 text-sm">No buildings constructed yet.</p>
                    )}
                  </div>

                  {/* Active Construction */}
                  <div>
                    <h5 className="font-medium mb-2">🚧 Active Projects</h5>
                    {province.constructions.length > 0 ? (
                      <div className="space-y-2">
                        {province.constructions.map((construction) => (
                          <div key={construction.id} className="bg-yellow-900 border border-yellow-600 rounded p-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {BUILDING_ICONS[construction.buildingType as keyof typeof BUILDING_ICONS]} {construction.buildingType.toLowerCase()} Level {construction.targetLevel}
                                </div>
                                <div className="text-xs text-yellow-300">
                                  Completes: {new Date(construction.finishesAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-stone-400 text-sm">No active construction projects.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Governors Mode */}
        {viewMode === 'governors' && (
          <div className="space-y-6">
            {/* Governor Statistics */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">👨‍💼 Governor Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-empire-gold">{governorStats.totalGovernors}</div>
                  <div className="text-stone-400">Active Governors</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-empire-gold">{governorStats.avgLoyalty}%</div>
                  <div className="text-stone-400">Average Loyalty</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-empire-gold">{governorStats.avgExperience}</div>
                  <div className="text-stone-400">Average XP</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-empire-gold">{provinces.length - governorStats.totalGovernors}</div>
                  <div className="text-stone-400">Vacant Provinces</div>
                </div>
              </div>

              {/* Personality Distribution */}
              <div>
                <h5 className="font-medium mb-2">🎭 Personality Distribution</h5>
                <div className="flex gap-4">
                  {Object.entries(governorStats.personalities).map(([personality, count]) => (
                    <div key={personality} className="flex items-center gap-2">
                      <span>{PERSONALITY_ICONS[personality as GovernorPersonality]}</span>
                      <span className="text-sm">{personality.toLowerCase()}: {count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Individual Governors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {provinces.map(province => (
                <div key={province.id} className="card">
                  <h4 className="font-semibold mb-3">{province.name}</h4>
                  
                  {province.governor ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{PERSONALITY_ICONS[province.governor.personality]}</div>
                        <div>
                          <div className="font-medium">{province.governor.name}</div>
                          <div className="text-sm text-stone-400 capitalize">
                            {province.governor.personality.toLowerCase()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-stone-400">Loyalty</div>
                          <div className="font-medium text-empire-gold">{province.governor.loyalty}%</div>
                        </div>
                        <div>
                          <div className="text-stone-400">Experience</div>
                          <div className="font-medium text-empire-gold">{province.governor.xp} XP</div>
                        </div>
                      </div>

                      <div className="bg-stone-700 rounded p-2 text-xs">
                        <div className="text-stone-400 mb-1">Performance:</div>
                        <div>
                          Managing {province.buildings.length} buildings, 
                          {province.constructions.length} active projects
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-stone-400 mb-2">No Governor Assigned</div>
                      <button className="btn-secondary text-sm">
                        🔍 Find Governor
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Province Detail Modal */}
        {selectedProvinceData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-stone-800 rounded-lg p-6 max-w-2xl w-full m-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{selectedProvinceData.name}</h3>
                <button
                  onClick={() => setSelectedProvince('')}
                  className="text-stone-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              
              {/* Province details here */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-empire-gold">{selectedProvinceData.buildings.length}</div>
                    <div className="text-stone-400">Buildings</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-empire-gold">{selectedProvinceData.constructions.length}</div>
                    <div className="text-stone-400">Projects</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-empire-gold">
                      {Object.values(selectedProvinceData.resources).reduce((sum, amount) => sum + amount, 0).toLocaleString()}
                    </div>
                    <div className="text-stone-400">Resources</div>
                  </div>
                </div>

                {selectedProvinceData.governor && (
                  <div className="card">
                    <h4 className="font-medium mb-2">👨‍💼 Governor</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{PERSONALITY_ICONS[selectedProvinceData.governor.personality]}</span>
                      <div>
                        <div className="font-medium">{selectedProvinceData.governor.name}</div>
                        <div className="text-sm text-stone-400">
                          {selectedProvinceData.governor.personality.toLowerCase()} • 
                          {selectedProvinceData.governor.loyalty}% loyalty • 
                          {selectedProvinceData.governor.xp} XP
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}