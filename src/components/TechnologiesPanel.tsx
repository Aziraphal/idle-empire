import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { TECHNOLOGY_DATA } from "@/lib/timer-service";
import { useClickOutside } from "@/hooks/useClickOutside";

interface TechnologiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIER_COLORS = {
  1: "border-green-600 bg-green-900 bg-opacity-20",
  2: "border-blue-600 bg-blue-900 bg-opacity-20", 
  3: "border-purple-600 bg-purple-900 bg-opacity-20",
  4: "border-orange-600 bg-orange-900 bg-opacity-20",
} as const;

const CATEGORY_ICONS = {
  ECONOMY: "💰",
  INFRASTRUCTURE: "🏗️",
  MILITARY: "⚔️", 
  SCIENCE: "🔬",
} as const;

const RESOURCE_ICONS = {
  gold: "🪙",
  food: "🌾",
  stone: "🪨", 
  iron: "⚔️",
  influence: "⭐",
  mana: "✨",
  energy: "⚡",
} as const;

export default function TechnologiesPanel({ isOpen, onClose }: TechnologiesPanelProps) {
  const [activeTab, setActiveTab] = useState<'tree' | 'research'>('tree');

  // Handle click outside to close panel
  const panelRef = useClickOutside<HTMLDivElement>(onClose, isOpen);

  const { data: technologyTree, refetch: refetchTree } = trpc.technologies.getTechnologyTree.useQuery(
    undefined,
    { enabled: isOpen }
  );

  const { data: availableTechnologies } = trpc.technologies.getAvailableTechnologies.useQuery(
    undefined, 
    { enabled: isOpen }
  );

  const { data: activeResearch, refetch: refetchResearch } = trpc.technologies.getActiveResearch.useQuery(
    undefined,
    { enabled: isOpen, refetchInterval: 5000 }
  );

  const startResearchMutation = trpc.technologies.startResearch.useMutation({
    onSuccess: () => {
      refetchTree();
      refetchResearch();
    },
  });

  const completeResearchMutation = trpc.technologies.completeResearch.useMutation({
    onSuccess: () => {
      refetchTree();
      refetchResearch();
    },
  });

  const handleStartResearch = async (techKey: string) => {
    try {
      await startResearchMutation.mutateAsync({ techKey });
    } catch (error) {
      console.error("Failed to start research:", error);
    }
  };

  const handleCompleteResearch = async (researchId: string) => {
    try {
      await completeResearchMutation.mutateAsync({ researchId });
    } catch (error) {
      console.error("Failed to complete research:", error);
    }
  };

  const formatTime = (hours: number, minutes: number) => {
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={panelRef} className="bg-stone-800 rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-stone-600">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-empire-gold flex items-center gap-2">
              🔬 Technologies & Research
            </h2>
            <button 
              onClick={onClose}
              className="text-stone-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          {technologyTree && (
            <div className="mt-2 text-sm text-stone-400">
              Researched: {technologyTree.researchedCount} technologies • 
              Available: {availableTechnologies?.length || 0} • 
              Active Research: {activeResearch?.length || 0}
            </div>
          )}
          
          {/* Tab Navigation */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('tree')}
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === 'tree'
                  ? 'bg-empire-gold text-stone-900'
                  : 'text-stone-300 hover:text-white border border-stone-600'
              }`}
            >
              🌳 Technology Tree
            </button>
            <button
              onClick={() => setActiveTab('research')}
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === 'research'
                  ? 'bg-empire-gold text-stone-900'
                  : 'text-stone-300 hover:text-white border border-stone-600'
              }`}
            >
              ⚗️ Research Lab ({activeResearch?.length || 0})
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'tree' && (
            <>
              {!technologyTree ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔬</div>
                  <p className="text-stone-400">Loading technology tree...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Technology Bonuses Summary */}
                  {technologyTree.totalBonuses && (
                    <div className="bg-stone-700 bg-opacity-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-empire-gold mb-3">🏆 Current Technology Bonuses</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {technologyTree.totalBonuses.farmProduction !== 1 && (
                          <div className="flex items-center gap-2">
                            <span>🌾 Farm Production:</span>
                            <span className="text-green-400">+{Math.round((technologyTree.totalBonuses.farmProduction - 1) * 100)}%</span>
                          </div>
                        )}
                        {technologyTree.totalBonuses.mineProduction !== 1 && (
                          <div className="flex items-center gap-2">
                            <span>⛏️ Mine Production:</span>
                            <span className="text-green-400">+{Math.round((technologyTree.totalBonuses.mineProduction - 1) * 100)}%</span>
                          </div>
                        )}
                        {technologyTree.totalBonuses.allProduction !== 1 && (
                          <div className="flex items-center gap-2">
                            <span>📈 All Production:</span>
                            <span className="text-green-400">+{Math.round((technologyTree.totalBonuses.allProduction - 1) * 100)}%</span>
                          </div>
                        )}
                        {technologyTree.totalBonuses.constructionSpeed !== 1 && (
                          <div className="flex items-center gap-2">
                            <span>🏗️ Construction:</span>
                            <span className="text-blue-400">+{Math.round((technologyTree.totalBonuses.constructionSpeed - 1) * 100)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Technology Tree by Tier */}
                  {technologyTree.tree.map((tierGroup) => (
                    <div key={`${tierGroup.tier}-${tierGroup.category}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-xl font-bold text-empire-gold">
                          Tier {tierGroup.tier}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span>{CATEGORY_ICONS[tierGroup.category as keyof typeof CATEGORY_ICONS]}</span>
                          <span className="text-stone-300">{tierGroup.category}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {tierGroup.technologies.map((tech) => (
                          <div
                            key={tech.key}
                            className={`border rounded-lg p-4 transition-all ${
                              TIER_COLORS[tierGroup.tier as keyof typeof TIER_COLORS] || "border-stone-600"
                            } ${tech.isResearched ? 'opacity-75' : tech.isAvailable ? 'hover:scale-105' : 'opacity-50'}`}
                          >
                            {/* Technology Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-bold text-lg text-empire-gold">
                                  {CATEGORY_ICONS[tierGroup.category as keyof typeof CATEGORY_ICONS]} {tech.tech.name}
                                </h4>
                                <p className="text-sm text-stone-400 mt-1">
                                  {tech.tech.description}
                                </p>
                              </div>
                              {tech.isResearched && (
                                <div className="text-green-400 text-xl">✓</div>
                              )}
                            </div>

                            {/* Research Cost */}
                            {!tech.isResearched && (
                              <>
                                <div className="mb-3">
                                  <div className="text-xs text-stone-500 mb-1">Research Cost:</div>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(tech.cost.cost).map(([resource, amount]) => (
                                      <span key={resource} className="text-xs bg-stone-700 px-2 py-1 rounded">
                                        {RESOURCE_ICONS[resource as keyof typeof RESOURCE_ICONS] || "📦"} {amount}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="text-xs text-stone-500 mt-1">
                                    ⏱️ {tech.cost.timeHours}h
                                  </div>
                                </div>

                                {/* Action Button */}
                                {tech.isAvailable && (
                                  <button
                                    onClick={() => handleStartResearch(tech.key)}
                                    disabled={startResearchMutation.isLoading}
                                    className="btn-primary w-full text-sm"
                                  >
                                    {startResearchMutation.isLoading ? "Starting..." : "🔬 Start Research"}
                                  </button>
                                )}

                                {!tech.isAvailable && !tech.isResearched && (
                                  <div className="text-xs text-red-400">
                                    Prerequisites not met
                                  </div>
                                )}
                              </>
                            )}

                            {/* Prerequisites */}
                            {tech.prerequisites.length > 0 && (
                              <div className="mt-2 text-xs">
                                <span className="text-stone-500">Requires:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {tech.prerequisites.map((prereq) => {
                                    const prereqTech = TECHNOLOGY_DATA[prereq];
                                    return (
                                      <span 
                                        key={prereq} 
                                        className="bg-stone-700 px-1 py-0.5 rounded text-stone-300"
                                      >
                                        {prereqTech?.name || prereq}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'research' && (
            <>
              {!activeResearch || activeResearch.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⚗️</div>
                  <h3 className="text-xl text-stone-300 mb-2">No Active Research</h3>
                  <p className="text-stone-500">
                    Visit the Technology Tree to start researching new technologies.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeResearch.map((research) => (
                    <div
                      key={research.id}
                      className="border border-stone-600 rounded-lg p-6 bg-stone-700 bg-opacity-30"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-empire-gold flex items-center gap-2">
                            🔬 {research.techData?.name || research.techKey}
                          </h3>
                          <p className="text-stone-400 mt-1">
                            {research.techData?.description || "Researching technology..."}
                          </p>
                        </div>
                        
                        {research.isComplete ? (
                          <button
                            onClick={() => handleCompleteResearch(research.id)}
                            disabled={completeResearchMutation.isLoading}
                            className="btn-primary bg-green-600 hover:bg-green-700"
                          >
                            {completeResearchMutation.isLoading ? "Completing..." : "✅ Complete Research"}
                          </button>
                        ) : (
                          <div className="text-right">
                            <div className="text-stone-500 text-sm">Time Remaining:</div>
                            <div className="text-lg font-bold text-empire-gold">
                              {formatTime(research.remainingHours, research.remainingMinutes)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="w-full bg-stone-600 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all ${
                              research.isComplete ? 'bg-green-500' : 'bg-empire-gold'
                            }`}
                            style={{ 
                              width: `${Math.max(0, Math.min(100, 100 - (research.remainingMs / (research.techData?.researchTime * 60 * 60 * 1000 || 1)) * 100))}%` 
                            }}
                          />
                        </div>
                        <div className="text-xs text-stone-500 mt-1 text-center">
                          {research.isComplete ? "Research Complete!" : "In Progress..."}
                        </div>
                      </div>

                      {/* Research Timeline */}
                      <div className="text-sm text-stone-400">
                        <div>Started: {new Date(research.startedAt).toLocaleString()}</div>
                        <div>Expected Completion: {new Date(research.finishesAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}