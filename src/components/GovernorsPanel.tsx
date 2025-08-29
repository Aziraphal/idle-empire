import { trpc } from "@/lib/trpc";
import { GovernorPersonality } from "@prisma/client";
import { useState } from "react";

interface GovernorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PERSONALITY_ICONS: Record<GovernorPersonality, string> = {
  CONSERVATIVE: "🛡️",
  AGGRESSIVE: "⚔️", 
  MERCHANT: "💰",
  EXPLORER: "🗺️",
};

const PERSONALITY_COLORS: Record<GovernorPersonality, string> = {
  CONSERVATIVE: "text-blue-400",
  AGGRESSIVE: "text-red-400",
  MERCHANT: "text-yellow-400", 
  EXPLORER: "text-purple-400",
};

const PERSONALITY_DESCRIPTIONS: Record<GovernorPersonality, string> = {
  CONSERVATIVE: "Focuses on food security and defensive buildings. Prioritizes stability over growth.",
  AGGRESSIVE: "Builds military structures first. Seeks rapid expansion through conquest.",
  MERCHANT: "Emphasizes trade and gold production. Builds marketplaces and trade infrastructure.",
  EXPLORER: "Prioritizes research and knowledge. Builds academies and explores new technologies.",
};

export default function GovernorsPanel({ isOpen, onClose }: GovernorsPanelProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [lastDecisions, setLastDecisions] = useState<any[]>([]);
  
  const { data: governorsData, refetch: refetchGovernors } = trpc.governors.getGovernors.useQuery();
  
  const executeAIMutation = trpc.governors.executeAIDecisions.useMutation({
    onSuccess: (data) => {
      setLastDecisions(data.decisions);
      refetchGovernors();
    },
    onError: (error) => {
      alert(`AI Execution failed: ${error.message}`);
    },
  });

  const initializeGovernorsMutation = trpc.governors.initializeGovernors.useMutation({
    onSuccess: (data) => {
      alert(`✅ ${data.message}!\n\nGovernors created:\n${data.governors.map(g => `- ${g.governor} in ${g.province}`).join('\n')}`);
      refetchGovernors();
    },
    onError: (error) => {
      alert(`❌ Failed to initialize governors: ${error.message}`);
    },
  });

  const triggerSingleMutation = trpc.governors.triggerGovernorDecision.useMutation({
    onSuccess: (data) => {
      setLastDecisions([{
        governorName: data.governorName,
        action: data.decision.action?.reason || "No action taken",
        reason: data.report,
      }]);
      refetchGovernors();
    },
    onError: (error) => {
      alert(`Governor decision failed: ${error.message}`);
    },
  });

  if (!isOpen || !governorsData) return null;

  const handleExecuteAllAI = () => {
    executeAIMutation.mutate();
  };

  const handleTriggerSingle = (provinceId: string) => {
    triggerSingleMutation.mutate({ provinceId });
  };

  const getLoyaltyColor = (loyalty: number): string => {
    if (loyalty >= 80) return "text-green-400";
    if (loyalty >= 60) return "text-yellow-400"; 
    if (loyalty >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getExperienceLevel = (xp: number): string => {
    if (xp >= 5000) return "Master";
    if (xp >= 2000) return "Expert";
    if (xp >= 1000) return "Experienced";
    if (xp >= 500) return "Competent";
    if (xp >= 100) return "Learning";
    return "Novice";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-stone-800 rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-empire-gold">👨‍💼 Governor Management</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* AI Control Panel */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">🤖 AI Control</h3>
            <div className="flex gap-2">
              <button
                onClick={handleExecuteAllAI}
                disabled={executeAIMutation.isLoading}
                className="btn-primary"
              >
                {executeAIMutation.isLoading ? "Processing..." : "🚀 Execute All AI Decisions"}
              </button>
              <div className="text-sm text-stone-400 self-center">
                🕐 Auto-runs every 15 min
              </div>
            </div>
          </div>
          
          <p className="text-stone-300 text-sm mb-4">
            Governors will automatically analyze their provinces and make decisions based on their personalities. 
            They can start construction projects and research based on available resources and current needs.
          </p>

          {/* Recent Decisions */}
          {lastDecisions.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">📋 Recent AI Decisions:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {lastDecisions.map((decision, index) => (
                  <div key={index} className="bg-stone-700 rounded p-3 text-sm">
                    <div className="font-medium text-empire-gold">
                      {decision.governorName} ({decision.provinceName})
                    </div>
                    <div className="text-stone-300">{decision.action}</div>
                    {decision.reason && (
                      <div className="text-stone-400 text-xs mt-1">{decision.reason}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Governors List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">🏛️ Provincial Governors</h3>
          
          {governorsData.provinces.map((province) => {
            const governor = province.governor;
            
            if (!governor) {
              return (
                <div key={province.id} className="card">
                  <div className="text-center py-8">
                    <h4 className="text-lg font-semibold mb-2">{province.name}</h4>
                    <p className="text-stone-400 mb-4">No governor assigned</p>
                    <button 
                      onClick={() => initializeGovernorsMutation.mutate()}
                      disabled={initializeGovernorsMutation.isLoading}
                      className="btn-secondary"
                    >
                      {initializeGovernorsMutation.isLoading ? "..." : "🔍 Find Governor"}
                    </button>
                  </div>
                </div>
              );
            }

            const personalityIcon = PERSONALITY_ICONS[governor.personality];
            const personalityColor = PERSONALITY_COLORS[governor.personality];
            const personalityDesc = PERSONALITY_DESCRIPTIONS[governor.personality];
            const loyaltyColor = getLoyaltyColor(governor.loyalty);
            const experienceLevel = getExperienceLevel(governor.xp);

            return (
              <div key={province.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{personalityIcon}</div>
                    <div>
                      <h4 className="text-lg font-semibold">{governor.name}</h4>
                      <div className="text-sm text-stone-300">{province.name} Province</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTriggerSingle(province.id)}
                    disabled={triggerSingleMutation.isLoading}
                    className="btn-secondary text-sm"
                  >
                    {triggerSingleMutation.isLoading ? "..." : "⚡ Ask for Decision"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Governor Stats */}
                  <div>
                    <h5 className="font-medium mb-2">👤 Governor Stats</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Personality:</span>
                        <span className={personalityColor}>
                          {personalityIcon} {governor.personality.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Loyalty:</span>
                        <span className={loyaltyColor}>{governor.loyalty}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Experience:</span>
                        <span className="text-empire-gold">
                          {experienceLevel} ({governor.xp} XP)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Province Status */}
                  <div>
                    <h5 className="font-medium mb-2">🏗️ Province Status</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Buildings:</span>
                        <span>{province.buildings.length} constructed</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Projects:</span>
                        <span>{province.constructions.length} in progress</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Resources:</span>
                        <span>
                          {Object.values(province.resources).reduce((sum, amount) => sum + amount, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personality Description */}
                <div className="bg-stone-700 rounded-lg p-3 mb-4">
                  <h5 className="font-medium mb-1 text-sm">🧠 Leadership Style</h5>
                  <p className="text-stone-300 text-sm">{personalityDesc}</p>
                </div>

                {/* Current Buildings */}
                {province.buildings.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-2 text-sm">🏢 Current Buildings</h5>
                    <div className="flex flex-wrap gap-2">
                      {province.buildings.map((building, idx) => (
                        <span
                          key={idx}
                          className="bg-stone-600 px-2 py-1 rounded text-xs"
                        >
                          {building.type.toLowerCase()} Lv.{building.level}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Active Research */}
        {governorsData.activeResearches.length > 0 && (
          <div className="card mt-6">
            <h3 className="text-lg font-semibold mb-4">🔬 Empire Research</h3>
            <div className="space-y-2">
              {governorsData.activeResearches.map((research) => (
                <div key={research.id} className="bg-stone-700 rounded p-3">
                  <div className="font-medium">{research.techKey}</div>
                  <div className="text-sm text-stone-400">
                    Completes: {new Date(research.finishesAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="card mt-6 bg-stone-700">
          <h3 className="text-lg font-semibold mb-3">💡 How Governor AI Works</h3>
          <div className="text-sm text-stone-300 space-y-2">
            <p>
              <strong>🤖 Automated Decisions:</strong> Governors analyze their province resources, buildings, and personality to make optimal decisions.
            </p>
            <p>
              <strong>📈 Experience System:</strong> Governors gain XP from successful decisions, becoming more effective over time.
            </p>
            <p>
              <strong>💝 Loyalty System:</strong> High loyalty governors make better decisions. Low loyalty reduces effectiveness.
            </p>
            <p>
              <strong>🎭 Personalities:</strong> Each personality has different building and research priorities:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li><span className={PERSONALITY_COLORS.CONSERVATIVE}>🛡️ Conservative:</span> Food security and defense first</li>
              <li><span className={PERSONALITY_COLORS.AGGRESSIVE}>⚔️ Aggressive:</span> Military expansion focus</li>
              <li><span className={PERSONALITY_COLORS.MERCHANT}>💰 Merchant:</span> Trade and gold production priority</li>
              <li><span className={PERSONALITY_COLORS.EXPLORER}>🗺️ Explorer:</span> Research and knowledge seeking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}