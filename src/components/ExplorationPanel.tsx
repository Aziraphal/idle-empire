import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { GovernorPersonality } from "@prisma/client";

interface ExplorationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TERRITORY_ICONS = {
  FERTILE_PLAINS: "🌾",
  MOUNTAIN_REGION: "⛰️", 
  FOREST_LANDS: "🌲",
  COASTAL_AREA: "🏖️",
  DESERT_OASIS: "🏜️",
  ANCIENT_RUINS: "🏛️",
};

const TERRITORY_COLORS = {
  FERTILE_PLAINS: "text-green-400",
  MOUNTAIN_REGION: "text-gray-400",
  FOREST_LANDS: "text-green-600", 
  COASTAL_AREA: "text-blue-400",
  DESERT_OASIS: "text-yellow-600",
  ANCIENT_RUINS: "text-purple-400",
};

const PERSONALITY_ICONS: Record<GovernorPersonality, string> = {
  CONSERVATIVE: "🛡️",
  AGGRESSIVE: "⚔️",
  MERCHANT: "💰", 
  EXPLORER: "🗺️",
};

const RESOURCE_ICONS = {
  gold: "🪙",
  food: "🌾",
  stone: "🪨", 
  iron: "⚔️",
  population: "👥",
  influence: "⭐",
};

interface Territory {
  id: string;
  name: string;
  type: keyof typeof TERRITORY_ICONS;
  difficulty: number;
  resources: any;
  specialFeatures: string[];
  explorationCost: Record<string, number>;
  colonizationCost: Record<string, number>;
  description: string;
  successChance: number;
  canAfford: boolean;
}

export default function ExplorationPanel({ isOpen, onClose }: ExplorationPanelProps) {
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [explorationResult, setExplorationResult] = useState<any>(null);
  const [selectedGovernor, setSelectedGovernor] = useState<any>(null);
  const [step, setStep] = useState<'explore' | 'colonize'>('explore');

  const { data: explorationData, refetch: refetchTerritories } = trpc.exploration.getAvailableTerritories.useQuery();
  const { data: empireData, refetch: refetchEmpire } = trpc.empire.getProductionSummary.useQuery();
  
  const exploreMutation = trpc.exploration.exploreTerritory.useMutation({
    onSuccess: (data) => {
      setExplorationResult(data);
      if (data.success) {
        setStep('colonize');
      }
      refetchTerritories();
      refetchEmpire();
    },
    onError: (error) => {
      alert(`Exploration failed: ${error.message}`);
    },
  });

  const colonizeMutation = trpc.exploration.colonizeTerritory.useMutation({
    onSuccess: (data) => {
      alert(data.message);
      onClose();
      setStep('explore');
      setSelectedTerritory(null);
      setExplorationResult(null);
      setSelectedGovernor(null);
      refetchTerritories();
      refetchEmpire();
    },
    onError: (error) => {
      alert(`Colonization failed: ${error.message}`);
    },
  });

  if (!isOpen || !explorationData) return null;

  const handleExplore = (territory: Territory) => {
    if (!territory.canAfford) {
      alert("Insufficient resources for exploration!");
      return;
    }
    
    setSelectedTerritory(territory);
    exploreMutation.mutate({
      territoryData: territory,
    });
  };

  const handleColonize = () => {
    if (!selectedTerritory || !selectedGovernor || !explorationResult) return;
    
    colonizeMutation.mutate({
      territoryData: selectedTerritory,
      selectedGovernor: selectedGovernor,
    });
  };

  const formatCost = (cost: Record<string, number>): string => {
    return Object.entries(cost)
      .map(([resource, amount]) => {
        const icon = RESOURCE_ICONS[resource as keyof typeof RESOURCE_ICONS];
        const available = explorationData.empireResources[resource.toLowerCase()] || 0;
        const affordable = available >= amount;
        return `${icon}${amount}${!affordable ? ' ❌' : ''}`;
      })
      .join(' ');
  };

  const getDifficultyColor = (difficulty: number): string => {
    if (difficulty <= 3) return "text-green-400";
    if (difficulty <= 6) return "text-yellow-400";
    return "text-red-400";
  };

  const getDifficultyText = (difficulty: number): string => {
    if (difficulty <= 3) return "Easy";
    if (difficulty <= 6) return "Medium";
    return "Hard";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-stone-800 rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-empire-gold">🗺️ Territorial Exploration</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Empire Stats */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-3">🏛️ Empire Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-empire-gold font-bold">{explorationData.provinceCount}</div>
              <div className="text-stone-400">Provinces</div>
            </div>
            <div className="text-center">
              <div className="text-empire-gold font-bold">
                {Object.values(explorationData.empireResources).reduce((sum, amount) => sum + amount, 0).toLocaleString()}
              </div>
              <div className="text-stone-400">Total Resources</div>
            </div>
            <div className="text-center">
              <div className="text-empire-gold font-bold">{explorationData.empireResources.influence || 0}</div>
              <div className="text-stone-400">Influence</div>
            </div>
            <div className="text-center">
              <div className="text-empire-gold font-bold">{explorationData.empireResources.gold || 0}</div>
              <div className="text-stone-400">Gold</div>
            </div>
          </div>
        </div>

        {step === 'explore' && (
          <>
            {/* Available Territories */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">🧭 Available Territories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {explorationData.territories.map((territory: Territory) => {
                  const territoryIcon = TERRITORY_ICONS[territory.type];
                  const territoryColor = TERRITORY_COLORS[territory.type];
                  const difficultyColor = getDifficultyColor(territory.difficulty);
                  const difficultyText = getDifficultyText(territory.difficulty);

                  return (
                    <div key={territory.id} className="card">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{territoryIcon}</div>
                          <div>
                            <h4 className="font-semibold">{territory.name}</h4>
                            <div className={`text-sm ${territoryColor}`}>
                              {territory.type.toLowerCase().replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${difficultyColor}`}>
                            {difficultyText}
                          </div>
                          <div className="text-xs text-stone-400">
                            Difficulty {territory.difficulty}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-stone-300 mb-3">{territory.description}</p>

                      {/* Special Features */}
                      <div className="mb-3">
                        <div className="text-sm font-medium mb-1">✨ Special Features:</div>
                        <div className="flex flex-wrap gap-1">
                          {territory.specialFeatures.map((feature, idx) => (
                            <span key={idx} className="bg-stone-600 px-2 py-1 rounded text-xs">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Resource Bonuses */}
                      <div className="mb-3">
                        <div className="text-sm font-medium mb-1">📊 Production Bonuses:</div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>🪙 Gold: {(territory.resources.goldMultiplier * 100).toFixed(0)}%</div>
                          <div>🌾 Food: {(territory.resources.foodMultiplier * 100).toFixed(0)}%</div>
                          <div>🪨 Stone: {(territory.resources.stoneMultiplier * 100).toFixed(0)}%</div>
                        </div>
                      </div>

                      {/* Exploration Cost & Success */}
                      <div className="mb-3">
                        <div className="text-sm font-medium mb-1">💰 Exploration Cost:</div>
                        <div className="text-sm">{formatCost(territory.explorationCost)}</div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          Success: <span className="text-green-400">{(territory.successChance * 100).toFixed(0)}%</span>
                        </div>
                        <button
                          onClick={() => handleExplore(territory)}
                          disabled={!territory.canAfford || exploreMutation.isLoading}
                          className={`px-4 py-2 rounded font-medium ${
                            territory.canAfford && !exploreMutation.isLoading
                              ? 'btn-primary'
                              : 'bg-stone-600 text-stone-400 cursor-not-allowed'
                          }`}
                        >
                          {exploreMutation.isLoading ? 'Exploring...' : '🧭 Explore'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {step === 'colonize' && explorationResult?.success && (
          <div className="space-y-6">
            {/* Exploration Success */}
            <div className="card bg-green-900 border-green-600">
              <h3 className="text-lg font-semibold mb-3 text-green-400">✅ Exploration Successful!</h3>
              <p className="text-green-100 mb-4">{explorationResult.message}</p>
              
              {selectedTerritory && (
                <div className="bg-green-800 rounded p-3">
                  <h4 className="font-medium mb-2">{selectedTerritory.name}</h4>
                  <p className="text-sm text-green-200">{selectedTerritory.description}</p>
                </div>
              )}
            </div>

            {/* Colonization Costs */}
            {selectedTerritory && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-3">🏗️ Colonization Requirements</h3>
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">💰 Colonization Cost:</div>
                  <div className="text-sm">{formatCost(selectedTerritory.colonizationCost)}</div>
                </div>
              </div>
            )}

            {/* Governor Selection */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-3">👨‍💼 Choose Governor</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {explorationResult.governorCandidates.map((candidate: any, idx: number) => {
                  const personalityIcon = PERSONALITY_ICONS[candidate.personality as GovernorPersonality];
                  const isSelected = selectedGovernor?.name === candidate.name;
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedGovernor(candidate)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-empire-gold bg-opacity-20 border-empire-gold'
                          : 'bg-stone-700 border-stone-600 hover:border-stone-500'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl">{personalityIcon}</div>
                        <div>
                          <h4 className="font-semibold">{candidate.name}</h4>
                          <div className="text-sm text-stone-400">
                            {candidate.personality.toLowerCase()}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-stone-300 mb-3">{candidate.description}</p>
                      <div className="text-xs">
                        <div>Loyalty: {candidate.initialLoyalty}%</div>
                        <div>Experience: {candidate.initialXP} XP</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Colonization Actions */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setStep('explore');
                  setExplorationResult(null);
                  setSelectedTerritory(null);
                  setSelectedGovernor(null);
                }}
                className="btn-secondary"
              >
                ← Back to Exploration
              </button>
              <button
                onClick={handleColonize}
                disabled={!selectedGovernor || colonizeMutation.isLoading}
                className={`px-6 py-2 rounded font-medium ${
                  selectedGovernor && !colonizeMutation.isLoading
                    ? 'btn-primary'
                    : 'bg-stone-600 text-stone-400 cursor-not-allowed'
                }`}
              >
                {colonizeMutation.isLoading ? 'Colonizing...' : '🏗️ Establish Colony'}
              </button>
            </div>
          </div>
        )}

        {explorationResult && !explorationResult.success && (
          <div className="card bg-red-900 border-red-600">
            <h3 className="text-lg font-semibold mb-3 text-red-400">❌ Exploration Failed</h3>
            <p className="text-red-100 mb-4">{explorationResult.message}</p>
            <button
              onClick={() => {
                setExplorationResult(null);
                setSelectedTerritory(null);
                refetchTerritories();
              }}
              className="btn-secondary"
            >
              🔄 Try New Territories
            </button>
          </div>
        )}

        {/* Help Section */}
        <div className="card mt-6 bg-stone-700">
          <h3 className="text-lg font-semibold mb-3">💡 How Exploration Works</h3>
          <div className="text-sm text-stone-300 space-y-2">
            <p><strong>🧭 Exploration:</strong> Send expeditions to discover new territories. Higher difficulty means lower success chance but better rewards.</p>
            <p><strong>🏗️ Colonization:</strong> Establish permanent settlements in successfully explored territories with assigned governors.</p>
            <p><strong>📊 Territory Bonuses:</strong> Different territory types provide unique production bonuses and special features.</p>
            <p><strong>👨‍💼 Governors:</strong> Each new colony needs a governor. Choose wisely based on territory type and your empire's needs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}