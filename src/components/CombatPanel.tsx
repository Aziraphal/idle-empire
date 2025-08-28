import { trpc } from "@/lib/trpc";
import { useState } from "react";

interface CombatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ENEMY_TYPE_COLORS = {
  BARBARIAN_SCOUTS: "text-red-400 border-red-600 bg-red-900 bg-opacity-20",
  BARBARIAN_WARRIORS: "text-red-500 border-red-500 bg-red-800 bg-opacity-30",
  BARBARIAN_HORDE: "text-red-600 border-red-400 bg-red-700 bg-opacity-40",
  BEAST_PACK: "text-green-400 border-green-600 bg-green-900 bg-opacity-20",
  RIVAL_SPIES: "text-purple-400 border-purple-600 bg-purple-900 bg-opacity-20",
  BANDIT_GANG: "text-yellow-400 border-yellow-600 bg-yellow-900 bg-opacity-20",
  CULTIST_SECT: "text-indigo-400 border-indigo-600 bg-indigo-900 bg-opacity-20"
} as const;

const OUTCOME_COLORS = {
  VICTORY: "text-green-400 bg-green-900 bg-opacity-30",
  DEFEAT: "text-red-400 bg-red-900 bg-opacity-30",
  DRAW: "text-yellow-400 bg-yellow-900 bg-opacity-30"
} as const;

export default function CombatPanel({ isOpen, onClose }: CombatPanelProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const { data: activeRaids, refetch: refetchRaids } = trpc.combat.getActiveRaids.useQuery(
    undefined,
    { enabled: isOpen, refetchInterval: 10000 } // Refresh every 10 seconds
  );

  const { data: combatHistory } = trpc.combat.getCombatHistory.useQuery(
    { limit: 20 },
    { enabled: isOpen && activeTab === 'history' }
  );

  const autoResolveMutation = trpc.combat.autoResolveRaid.useMutation({
    onSuccess: () => {
      refetchRaids();
    }
  });

  const formatTimeUntilArrival = (milliseconds: number) => {
    if (milliseconds <= 0) return "ARRIVING NOW!";
    
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const formatResourceChange = (amount: number, resource: string) => {
    const icon = {
      gold: "🪙",
      food: "🌾", 
      stone: "🪨",
      iron: "⚔️",
      population: "👥",
      influence: "⭐"
    }[resource] || "📦";
    
    const color = amount > 0 ? "text-green-400" : "text-red-400";
    const sign = amount > 0 ? "+" : "";
    
    return (
      <span className={`${color} text-sm`}>
        {icon} {sign}{amount}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-stone-800 rounded-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-stone-600">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-empire-gold flex items-center gap-2">
              ⚔️ Combat & Defense
            </h2>
            <button 
              onClick={onClose}
              className="text-stone-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === 'active'
                  ? 'bg-empire-gold text-stone-900'
                  : 'text-stone-300 hover:text-white border border-stone-600'
              }`}
            >
              Active Raids ({activeRaids?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded transition-colors ${
                activeTab === 'history'
                  ? 'bg-empire-gold text-stone-900'
                  : 'text-stone-300 hover:text-white border border-stone-600'
              }`}
            >
              Combat History
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'active' && (
            <>
              {!activeRaids || activeRaids.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🛡️</div>
                  <h3 className="text-xl text-stone-300 mb-2">Your Empire is Secure</h3>
                  <p className="text-stone-500">
                    No raids detected. Your governors maintain vigilant watch...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeRaids.map((raid) => {
                    const isImminent = raid.timeUntilArrival < 5 * 60 * 1000; // 5 minutes
                    const hasArrived = raid.timeUntilArrival <= 0;
                    const enemyColor = ENEMY_TYPE_COLORS[raid.enemyType as keyof typeof ENEMY_TYPE_COLORS] || "text-gray-400 border-gray-600";

                    return (
                      <div
                        key={raid.id}
                        className={`border rounded-lg p-6 transition-all ${enemyColor} ${
                          isImminent ? 'animate-pulse shadow-lg' : ''
                        }`}
                      >
                        {/* Raid Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">
                              {raid.enemyType.includes('BARBARIAN') ? '🪓' :
                               raid.enemyType.includes('BEAST') ? '🐺' :
                               raid.enemyType.includes('BANDIT') ? '🔪' :
                               raid.enemyType.includes('SPY') ? '🕵️' :
                               '🔮'}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold">
                                {raid.enemyName}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-stone-400">
                                <span>📍 {raid.provinceName}</span>
                                <span>•</span>
                                <span>⚡ Strength: {raid.enemyStrength}</span>
                                <span>•</span>
                                <span>⚠️ Threat: {raid.enemyThreatLevel}/10</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className={`text-right font-bold ${hasArrived ? 'text-red-400' : isImminent ? 'text-orange-400' : 'text-stone-300'}`}>
                            <div className="text-sm">
                              {hasArrived ? '🚨 UNDER ATTACK!' : '⏰ ETA'}
                            </div>
                            <div className="text-lg">
                              {formatTimeUntilArrival(raid.timeUntilArrival)}
                            </div>
                          </div>
                        </div>

                        {/* Preparation Status */}
                        <div className="bg-stone-700 bg-opacity-50 rounded-lg p-4 mb-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold mb-1">Defense Status</h4>
                              <p className="text-sm text-stone-400">
                                Your governor is organizing defenses...
                              </p>
                            </div>
                            
                            {hasArrived && (
                              <button
                                onClick={() => autoResolveMutation.mutate({ raidId: raid.id })}
                                disabled={autoResolveMutation.isLoading}
                                className="btn-primary bg-red-600 hover:bg-red-700"
                              >
                                {autoResolveMutation.isLoading ? "Resolving..." : "⚔️ Auto-Resolve"}
                              </button>
                            )}
                          </div>
                          
                          {/* Preparation Progress */}
                          <div className="mt-3">
                            <div className="w-full bg-stone-600 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  hasArrived ? 'bg-red-500' : 'bg-empire-gold'
                                }`}
                                style={{ 
                                  width: `${Math.max(0, Math.min(100, 100 - (raid.timeUntilArrival / (raid.preparationTime * 60 * 1000)) * 100))}%` 
                                }}
                              />
                            </div>
                            <div className="text-xs text-stone-500 mt-1">
                              {hasArrived ? "Combat in progress..." : "Preparation time remaining"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <>
              {!combatHistory || combatHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📜</div>
                  <h3 className="text-xl text-stone-300 mb-2">No Combat History</h3>
                  <p className="text-stone-500">
                    Your provinces have not yet faced any raids or attacks.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {combatHistory.map((battle) => {
                    const outcomeColor = OUTCOME_COLORS[battle.combatOutcome as keyof typeof OUTCOME_COLORS];
                    const decisiveVictory = battle.combatOutcome === 'VICTORY' && (battle.victoryCertainty || 0) > 0.8;

                    return (
                      <div
                        key={battle.id}
                        className="border border-stone-600 rounded-lg p-4 hover:border-stone-500 transition-colors"
                      >
                        {/* Battle Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              <span>⚔️ {battle.enemyName}</span>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${outcomeColor}`}>
                                {battle.combatOutcome === 'VICTORY' && decisiveVictory ? 'DECISIVE VICTORY' :
                                 battle.combatOutcome === 'VICTORY' ? 'VICTORY' :
                                 battle.combatOutcome === 'DEFEAT' ? 'DEFEAT' : 'DRAW'}
                              </span>
                            </h4>
                            <div className="text-sm text-stone-400">
                              📍 {battle.province.name} • {new Date(battle.resolvedAt!).toLocaleString()}
                            </div>
                          </div>
                          
                          <div className="text-right text-sm">
                            <div>Casualties: {battle.defenderCasualties}</div>
                            <div>Enemy KIA: {battle.enemyCasualties}</div>
                          </div>
                        </div>

                        {/* Battle Report */}
                        <div className="bg-stone-700 bg-opacity-30 rounded p-3 mb-3">
                          <p className="text-sm text-stone-300 italic">
                            "{battle.battleReport}"
                          </p>
                        </div>

                        {/* Rewards/Losses */}
                        <div className="flex gap-6 text-sm">
                          {battle.resourcesGained && Object.keys(battle.resourcesGained as any).length > 0 && (
                            <div>
                              <span className="text-stone-500">Gained:</span>
                              <div className="flex gap-2 mt-1">
                                {Object.entries(battle.resourcesGained as Record<string, number>).map(([resource, amount]) => 
                                  amount !== 0 ? formatResourceChange(amount, resource) : null
                                )}
                              </div>
                            </div>
                          )}
                          
                          {battle.resourcesLost && Object.keys(battle.resourcesLost as any).length > 0 && (
                            <div>
                              <span className="text-stone-500">Lost:</span>
                              <div className="flex gap-2 mt-1">
                                {Object.entries(battle.resourcesLost as Record<string, number>).map(([resource, amount]) => 
                                  amount !== 0 ? formatResourceChange(amount, resource) : null
                                )}
                              </div>
                            </div>
                          )}
                          
                          {battle.governorXpGained > 0 && (
                            <div>
                              <span className="text-stone-500">Governor:</span>
                              <div className="text-blue-400 mt-1">
                                +{battle.governorXpGained} XP
                                {battle.governorLoyaltyChange !== 0 && (
                                  <span className={battle.governorLoyaltyChange > 0 ? "text-green-400 ml-1" : "text-red-400 ml-1"}>
                                    {battle.governorLoyaltyChange > 0 ? "+" : ""}{battle.governorLoyaltyChange}% loyalty
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}