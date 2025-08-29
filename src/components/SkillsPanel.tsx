import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { SKILL_CATEGORIES } from "@/lib/skill-data";

interface SkillsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const RESOURCE_ICONS = {
  gold: "🪙",
  food: "🌾",
  stone: "🪨",
  iron: "⚔️",
  influence: "⭐",
  mana: "✨",
  energy: "⚡",
} as const;

export default function SkillsPanel({ isOpen, onClose }: SkillsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSkillKey, setSelectedSkillKey] = useState<string>('');
  
  // Handle click outside to close panel
  const panelRef = useClickOutside<HTMLDivElement>(onClose, isOpen);
  
  const { data: skillsData, refetch: refetchSkills } = trpc.skills.getPlayerSkills.useQuery();
  
  const unlockSkillMutation = trpc.skills.unlockSkill.useMutation({
    onSuccess: () => {
      refetchSkills();
    },
    onError: (error) => {
      alert(`Failed to unlock skill: ${error.message}`);
    },
  });

  const useSkillMutation = trpc.skills.useSkill.useMutation({
    onSuccess: (result) => {
      alert(result.message);
      refetchSkills();
    },
    onError: (error) => {
      alert(`Failed to use skill: ${error.message}`);
    },
  });

  if (!isOpen || !skillsData) return null;

  const { skills, playerLevel, resources } = skillsData;

  // Filter skills by category
  const filteredSkills = selectedCategory === 'ALL' 
    ? skills 
    : skills.filter(skill => skill.category === selectedCategory);

  // Group skills by category for display
  const skillsByCategory = Object.entries(SKILL_CATEGORIES).map(([category, info]) => ({
    category,
    ...info,
    skills: skills.filter(skill => skill.category === category),
    unlockedCount: skills.filter(skill => skill.category === category && skill.isUnlocked).length,
  }));

  const handleUnlockSkill = (skillKey: string) => {
    unlockSkillMutation.mutate({ skillKey });
  };

  const handleUseSkill = (skillKey: string) => {
    useSkillMutation.mutate({ skillKey });
  };

  const formatCooldown = (cooldownExpiresAt: Date | null) => {
    if (!cooldownExpiresAt) return null;
    
    const now = new Date();
    const remaining = Math.max(0, cooldownExpiresAt.getTime() - now.getTime());
    
    if (remaining === 0) return null;
    
    const minutes = Math.floor(remaining / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const canAffordSkill = (skill: any) => {
    if (skill.energyCost > (resources.energy || 0)) return false;
    if (skill.manaCost > (resources.mana || 0)) return false;
    
    for (const [resource, cost] of Object.entries(skill.resourceCosts as Record<string, number>)) {
      if ((resources[resource] || 0) < cost) return false;
    }
    
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div ref={panelRef} className="bg-stone-800 rounded-lg p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-empire-gold">⚡ Active Skills</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Player Info */}
        <div className="bg-stone-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Level {playerLevel} Empire</h3>
              <p className="text-stone-300">Skills Unlocked: {skillsData.unlockedCount}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span>⚡</span>
                <span className="text-yellow-300">{resources.energy || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>✨</span>
                <span className="text-purple-300">{resources.mana || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>🪙</span>
                <span className="text-yellow-300">{resources.gold || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-empire-gold text-black'
                : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
            }`}
          >
            All Skills
          </button>
          {Object.entries(SKILL_CATEGORIES).map(([category, info]) => {
            const categorySkills = skills.filter(skill => skill.category === category);
            const unlockedCount = categorySkills.filter(skill => skill.isUnlocked).length;
            
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  selectedCategory === category
                    ? 'bg-empire-gold text-black'
                    : `bg-stone-700 ${info.color} hover:bg-stone-600`
                }`}
              >
                <span>{info.icon}</span>
                <span>{info.name}</span>
                <span className="text-xs bg-stone-600 px-2 py-1 rounded">
                  {unlockedCount}/{categorySkills.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => {
            const cooldownText = formatCooldown(skill.cooldownExpiresAt);
            const isOnCooldown = skill.isOnCooldown && cooldownText;
            const canAfford = canAffordSkill(skill);
            
            return (
              <div
                key={skill.key}
                className={`bg-stone-700 rounded-lg p-4 border-2 transition-all ${
                  skill.isUnlocked
                    ? `border-green-600 ${isOnCooldown ? 'opacity-75' : 'hover:border-green-400'}`
                    : skill.canUnlock
                    ? 'border-blue-600 hover:border-blue-400'
                    : 'border-stone-600 opacity-75'
                }`}
              >
                {/* Skill Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{skill.icon}</span>
                    <div>
                      <h3 className={`font-bold ${SKILL_CATEGORIES[skill.category].color}`}>
                        {skill.name}
                      </h3>
                      <p className="text-xs text-stone-400">
                        {SKILL_CATEGORIES[skill.category].name} • Level {skill.level}/{skill.maxLevel}
                      </p>
                    </div>
                  </div>
                  {skill.category === 'ULTIMATE' && (
                    <span className="text-yellow-300 text-xs font-bold bg-yellow-900 px-2 py-1 rounded">
                      ULTIMATE
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-stone-300 text-sm mb-3">{skill.description}</p>

                {/* Costs */}
                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                  {skill.energyCost > 0 && (
                    <span className={`flex items-center gap-1 px-2 py-1 rounded ${
                      (resources.energy || 0) >= skill.energyCost ? 'bg-blue-900 text-blue-200' : 'bg-red-900 text-red-200'
                    }`}>
                      ⚡ {skill.energyCost}
                    </span>
                  )}
                  {skill.manaCost > 0 && (
                    <span className={`flex items-center gap-1 px-2 py-1 rounded ${
                      (resources.mana || 0) >= skill.manaCost ? 'bg-purple-900 text-purple-200' : 'bg-red-900 text-red-200'
                    }`}>
                      ✨ {skill.manaCost}
                    </span>
                  )}
                  {Object.entries(skill.resourceCosts as Record<string, number>).map(([resource, cost]) => (
                    <span key={resource} className={`flex items-center gap-1 px-2 py-1 rounded ${
                      (resources[resource] || 0) >= cost ? 'bg-stone-600 text-stone-200' : 'bg-red-900 text-red-200'
                    }`}>
                      {RESOURCE_ICONS[resource as keyof typeof RESOURCE_ICONS]} {cost}
                    </span>
                  ))}
                </div>

                {/* Cooldown */}
                <div className="text-xs text-stone-400 mb-3">
                  Cooldown: {Math.floor(skill.cooldownSeconds / 60)}m {skill.cooldownSeconds % 60}s
                  {skill.timesUsed > 0 && (
                    <span className="ml-2">• Used {skill.timesUsed} times</span>
                  )}
                </div>

                {/* Requirements (if not unlocked) */}
                {!skill.isUnlocked && skill.missingRequirements.length > 0 && (
                  <div className="text-xs text-red-400 mb-3">
                    <p className="font-semibold">Requirements:</p>
                    <ul className="list-disc list-inside">
                      {skill.missingRequirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Button */}
                <div className="mt-4">
                  {!skill.isUnlocked ? (
                    <button
                      onClick={() => handleUnlockSkill(skill.key)}
                      disabled={!skill.canUnlock || unlockSkillMutation.isLoading}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                        skill.canUnlock
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-stone-600 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {unlockSkillMutation.isLoading ? 'Unlocking...' : '🔓 Unlock Skill'}
                    </button>
                  ) : isOnCooldown ? (
                    <button
                      disabled
                      className="w-full py-2 px-4 rounded-lg font-medium bg-stone-600 text-stone-400 cursor-not-allowed"
                    >
                      ⏱️ Cooldown: {cooldownText}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUseSkill(skill.key)}
                      disabled={!canAfford || useSkillMutation.isLoading}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                        canAfford
                          ? `bg-green-600 hover:bg-green-500 text-white ${SKILL_CATEGORIES[skill.category].color}`
                          : 'bg-red-900 text-red-400 cursor-not-allowed'
                      }`}
                    >
                      {useSkillMutation.isLoading ? 'Activating...' : `${skill.icon} Use Skill`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredSkills.length === 0 && (
          <div className="text-center py-8 text-stone-400">
            <p>No skills available in this category.</p>
            <p className="text-sm">Advance your empire to unlock more skills!</p>
          </div>
        )}
      </div>
    </div>
  );
}