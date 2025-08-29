import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";

interface QuestsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUEST_TYPE_ICONS: Record<string, string> = {
  TUTORIAL: "📚",
  DAILY: "📅", 
  WEEKLY: "📆",
  SEASONAL: "🌟",
  ACHIEVEMENT: "🏆",
  STORY: "📖",
};

const QUEST_TYPE_COLORS: Record<string, string> = {
  TUTORIAL: "text-blue-400",
  DAILY: "text-green-400",
  WEEKLY: "text-purple-400", 
  SEASONAL: "text-yellow-400",
  ACHIEVEMENT: "text-orange-400",
  STORY: "text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  LOCKED: "text-stone-500",
  AVAILABLE: "text-blue-400",
  IN_PROGRESS: "text-yellow-400",
  COMPLETED: "text-green-400",
  CLAIMED: "text-stone-400",
};

const STATUS_LABELS: Record<string, string> = {
  LOCKED: "Locked",
  AVAILABLE: "Available", 
  IN_PROGRESS: "In Progress",
  COMPLETED: "Complete!",
  CLAIMED: "Claimed",
};

export default function QuestsPanel({ isOpen, onClose }: QuestsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  // Handle click outside to close panel
  const panelRef = useClickOutside<HTMLDivElement>(onClose, isOpen);
  
  const { data: questsData, refetch: refetchQuests } = trpc.quests.getPlayerQuests.useQuery();
  
  const initializeTutorialMutation = trpc.quests.initializeTutorialQuests.useMutation({
    onSuccess: () => {
      refetchQuests();
    },
    onError: (error) => {
      console.log(`Tutorial already initialized: ${error.message}`);
    },
  });

  const claimRewardsMutation = trpc.quests.claimQuestRewards.useMutation({
    onSuccess: (data) => {
      alert(`🎉 Rewards claimed!\\n\\n${formatRewards(data.rewards)}`);
      refetchQuests();
    },
    onError: (error) => {
      alert(`❌ Failed to claim rewards: ${error.message}`);
    },
  });

  if (!isOpen) return null;

  const quests = questsData?.quests || [];
  const uniqueCategories = Array.from(new Set(quests.map(q => q.category)));
  const categories = ['ALL', ...uniqueCategories];
  
  const filteredQuests = selectedCategory === 'ALL' 
    ? quests 
    : quests.filter(q => q.category === selectedCategory);

  const handleInitializeTutorial = () => {
    initializeTutorialMutation.mutate();
  };

  const handleClaimRewards = (playerQuestId: string) => {
    claimRewardsMutation.mutate({ playerQuestId });
  };

  const formatProgress = (quest: any): string => {
    const objectives = quest.objectives;
    const progress = quest.progress;

    switch (objectives.type) {
      case "BUILD_BUILDING":
        return `${progress.currentAmount || 0}/${objectives.amount}`;
      case "REACH_LEVEL":
        return `Level ${progress.currentLevel || 0}/${objectives.level}`;
      case "COLLECT_RESOURCE":
        return `${progress.currentAmount || 0}/${objectives.amount}`;
      case "RESEARCH_TECH":
        return `${progress.currentAmount || 0}/${objectives.amount || 1}`;
      default:
        return "0/1";
    }
  };

  const getProgressPercentage = (quest: any): number => {
    const objectives = quest.objectives;
    const progress = quest.progress;

    switch (objectives.type) {
      case "BUILD_BUILDING":
        return Math.min(100, ((progress.currentAmount || 0) / objectives.amount) * 100);
      case "REACH_LEVEL":
        return Math.min(100, ((progress.currentLevel || 0) / objectives.level) * 100);
      case "COLLECT_RESOURCE":
        return Math.min(100, ((progress.currentAmount || 0) / objectives.amount) * 100);
      case "RESEARCH_TECH":
        return Math.min(100, ((progress.currentAmount || 0) / (objectives.amount || 1)) * 100);
      default:
        return 0;
    }
  };

  const formatRewards = (rewards: any): string => {
    const parts = [];
    if (rewards.resources) {
      const resourceList = Object.entries(rewards.resources)
        .map(([type, amount]) => `${amount} ${type}`)
        .join(', ');
      parts.push(`Resources: ${resourceList}`);
    }
    if (rewards.xp) parts.push(`XP: ${rewards.xp}`);
    if (rewards.title) parts.push(`Title: ${rewards.title}`);
    if (rewards.cosmetic) parts.push(`Cosmetic: ${rewards.cosmetic}`);
    return parts.join('\\n');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div ref={panelRef} className="bg-stone-800 rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-empire-gold">📋 Quest Journal</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Quest Management */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">📚 Quest Management</h3>
            <button
              onClick={handleInitializeTutorial}
              disabled={initializeTutorialMutation.isLoading}
              className="btn-secondary"
            >
              {initializeTutorialMutation.isLoading ? "..." : "🚀 Initialize Tutorial Quests"}
            </button>
          </div>
          
          <p className="text-stone-300 text-sm">
            Complete quests to earn resources, experience, and unlock new content. 
            Tutorial quests guide you through your first steps in the empire.
          </p>
        </div>

        {/* Category Filter */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-3">🗂️ Categories</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedCategory === category
                    ? "bg-empire-gold text-stone-900"
                    : "bg-stone-700 text-stone-300 hover:bg-stone-600"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Quests List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            📋 Quests ({filteredQuests.length})
          </h3>
          
          {filteredQuests.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-stone-400 mb-4">No quests available in this category</p>
              {selectedCategory === 'ALL' && (
                <button
                  onClick={handleInitializeTutorial}
                  disabled={initializeTutorialMutation.isLoading}
                  className="btn-primary"
                >
                  {initializeTutorialMutation.isLoading ? "..." : "🎯 Get Started with Tutorial Quests"}
                </button>
              )}
            </div>
          )}

          {filteredQuests.map((quest) => {
            const typeIcon = QUEST_TYPE_ICONS[quest.type] || "❓";
            const typeColor = QUEST_TYPE_COLORS[quest.type] || "text-stone-400";
            const statusColor = STATUS_COLORS[quest.status] || "text-stone-400";
            const statusLabel = STATUS_LABELS[quest.status] || quest.status;
            const progressPercent = getProgressPercentage(quest);
            const isCompleted = quest.status === "COMPLETED";
            const isClaimed = quest.status === "CLAIMED";

            return (
              <div key={quest.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{typeIcon}</div>
                    <div>
                      <h4 className="text-lg font-semibold">{quest.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-stone-300">
                        <span className={typeColor}>{quest.type.toLowerCase()}</span>
                        <span>•</span>
                        <span>{quest.category}</span>
                        <span>•</span>
                        <span className={statusColor}>{statusLabel}</span>
                      </div>
                    </div>
                  </div>
                  
                  {isCompleted && !isClaimed && (
                    <button
                      onClick={() => handleClaimRewards(quest.id)}
                      disabled={claimRewardsMutation.isLoading}
                      className="btn-primary text-sm"
                    >
                      {claimRewardsMutation.isLoading ? "..." : "🎁 Claim Rewards"}
                    </button>
                  )}
                </div>

                <p className="text-stone-300 text-sm mb-4">{quest.description}</p>

                {/* Progress Bar */}
                {!isClaimed && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Progress:</span>
                      <span>{formatProgress(quest)}</span>
                    </div>
                    <div className="w-full bg-stone-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isCompleted ? "bg-green-400" : "bg-blue-400"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Rewards */}
                <div className="bg-stone-700 rounded-lg p-3">
                  <h5 className="font-medium mb-2 text-sm">🎁 Rewards</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {quest.rewards && typeof quest.rewards === 'object' && 'resources' in quest.rewards && quest.rewards.resources && 
                     Object.entries(quest.rewards.resources as Record<string, number>).map(([type, amount]) => (
                      <div key={type} className="flex items-center gap-1">
                        <span className="text-empire-gold">+{amount}</span>
                        <span className="text-stone-300">{type}</span>
                      </div>
                    ))}
                    {quest.rewards && typeof quest.rewards === 'object' && 'xp' in quest.rewards && quest.rewards.xp && (
                      <div className="flex items-center gap-1">
                        <span className="text-blue-400">+{quest.rewards.xp as number}</span>
                        <span className="text-stone-300">XP</span>
                      </div>
                    )}
                    {quest.rewards && typeof quest.rewards === 'object' && 'title' in quest.rewards && quest.rewards.title && (
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">🏷️</span>
                        <span className="text-stone-300">{quest.rewards.title as string}</span>
                      </div>
                    )}
                    {quest.rewards && typeof quest.rewards === 'object' && 'cosmetic' in quest.rewards && quest.rewards.cosmetic && (
                      <div className="flex items-center gap-1">
                        <span className="text-pink-400">🎨</span>
                        <span className="text-stone-300">{quest.rewards.cosmetic as string}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="card mt-6 bg-stone-700">
          <h3 className="text-lg font-semibold mb-3">💡 Quest System Guide</h3>
          <div className="text-sm text-stone-300 space-y-2">
            <p>
              <strong>🎯 Quest Types:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><span className="text-blue-400">📚 Tutorial:</span> Learn the basics of empire management</li>
              <li><span className="text-green-400">📅 Daily:</span> Complete daily objectives for steady rewards</li>
              <li><span className="text-purple-400">📆 Weekly:</span> Longer challenges with bigger rewards</li>
              <li><span className="text-yellow-400">🌟 Seasonal:</span> Limited-time quests tied to current season</li>
              <li><span className="text-orange-400">🏆 Achievement:</span> Permanent milestones and accomplishments</li>
              <li><span className="text-red-400">📖 Story:</span> Follow the empire's narrative journey</li>
            </ul>
            <p className="mt-3">
              <strong>🚀 Tips:</strong> Complete tutorial quests first to learn the game mechanics. 
              Daily and weekly quests provide steady progression. Check back regularly for new content!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}