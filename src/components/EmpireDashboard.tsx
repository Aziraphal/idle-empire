import { trpc } from "@/lib/trpc";
import { ResourceType } from "@prisma/client";
import { useEffect, useState } from "react";
import { useSaveSystem } from "@/hooks/useSaveSystem";
import TasksPanel from "./TasksPanel";
import BuildPanel from "./BuildPanel";
import GovernorsPanel from "./GovernorsPanel";
import ExplorationPanel from "./ExplorationPanel";
import ProvincesPanel from "./ProvincesPanel";
import SavePanel from "./SavePanel";
import EventsPanel from "./EventsPanel";
import CombatPanel from "./CombatPanel";
import TechnologiesPanel from "./TechnologiesPanel";
import RankingsPanel from "./RankingsPanel";
import AlliancesPanel from "./AlliancesPanel";
import RewardsPanel from "./RewardsPanel";

interface EmpireDashboardProps {
  onLogout: () => void;
}

const RESOURCE_COLORS = {
  GOLD: "text-resource-gold",
  FOOD: "text-resource-food", 
  STONE: "text-resource-stone",
  IRON: "text-resource-iron",
  POP: "text-resource-population",
  INFLUENCE: "text-resource-influence",
};

const RESOURCE_ICONS = {
  GOLD: "🪙",
  FOOD: "🌾",
  STONE: "🪨",
  IRON: "⚔️",
  POP: "👥",
  INFLUENCE: "⭐",
};

export default function EmpireDashboard({ onLogout }: EmpireDashboardProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showBuildPanel, setShowBuildPanel] = useState(false);
  const [showEventNotification, setShowEventNotification] = useState(false);
  const [showGovernorsPanel, setShowGovernorsPanel] = useState(false);
  const [showExplorationPanel, setShowExplorationPanel] = useState(false);
  const [showProvincesPanel, setShowProvincesPanel] = useState(false);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [showEventsPanel, setShowEventsPanel] = useState(false);
  const [showCombatPanel, setShowCombatPanel] = useState(false);
  const [showTechnologiesPanel, setShowTechnologiesPanel] = useState(false);
  const [showRankingsPanel, setShowRankingsPanel] = useState(false);
  const [showAlliancesPanel, setShowAlliancesPanel] = useState(false);
  const [showRewardsPanel, setShowRewardsPanel] = useState(false);
  
  // First call getMyEmpire to trigger production updates
  const { refetch: refetchEmpire } = trpc.empire.getMyEmpire.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Also refetch empire data to update production
    }
  );
  
  const { data: productionSummary, refetch } = trpc.empire.processIdleAndEvents.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Refetch every 30 seconds - now includes event generation!
      onSuccess: (data) => {
        setLastUpdate(new Date());
        
        // Show notification if events were generated
        if (data?.eventGenerationTriggered) {
          setShowEventNotification(true);
          setTimeout(() => setShowEventNotification(false), 5000); // Hide after 5 seconds
        }
      },
    }
  );

  const { data: governorsData } = trpc.governors.getGovernors.useQuery();
  const { data: activeEvents } = trpc.events.getActiveEvents.useQuery();
  const { data: activeRaids } = trpc.combat.getActiveRaids.useQuery();
  const { data: currentSeason } = trpc.seasons.getCurrentSeason.useQuery();
  const { data: mySeasonProgress } = trpc.seasons.getMySeasonProgress.useQuery();
  const { data: myAlliance } = trpc.alliances.getMyAlliance.useQuery();
  const { data: myInvitations } = trpc.alliances.getMyInvitations.useQuery();
  const { saveStatus, formatPlayTime } = useSaveSystem();

  // Manual refresh button
  const handleRefresh = async () => {
    await refetchEmpire(); // First trigger production update
    refetch(); // Then refresh summary
  };

  if (!productionSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-empire-gold text-xl">Loading your empire...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Event Generation Notification */}
      {showEventNotification && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎭</span>
            <span className="font-semibold">New events have occurred!</span>
          </div>
        </div>
      )}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-empire-gold mb-2">
          🏛️ Your Empire
        </h1>
        <p className="text-stone-300">
          {productionSummary.provinceCount} province(s) • {productionSummary.governorCount} governor(s) active
          {productionSummary.activeEventCount > 0 && (
            <span className="text-orange-400"> • {productionSummary.activeEventCount} event(s) pending</span>
          )}
          {activeRaids && activeRaids.length > 0 && (
            <span className="text-red-400"> • {activeRaids.length} raid(s) incoming!</span>
          )}
        </p>
        
        {/* Save Status Indicator */}
        <div className="text-xs text-stone-500 mt-1">
          {saveStatus.autoSaveEnabled && saveStatus.hasLocalSave && (
            <span className="flex items-center gap-1 justify-center">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Auto-save active • Last: {saveStatus.lastSaveTime ? new Date(saveStatus.lastSaveTime).toLocaleTimeString() : 'Never'} • 
              Play time: {formatPlayTime(saveStatus.totalPlayTime)}
            </span>
          )}
          {!saveStatus.hasLocalSave && (
            <span className="flex items-center gap-1 justify-center text-yellow-500">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              No save found - Click "💾 Save Game" to save your progress
            </span>
          )}
        </div>
        <div className="mt-2 flex gap-2 justify-center flex-wrap">
          <button
            onClick={handleRefresh}
            className="btn-secondary text-sm"
          >
            🔄 Refresh ({lastUpdate.toLocaleTimeString()})
          </button>
          <button
            onClick={() => setShowProvincesPanel(true)}
            className="btn-primary text-sm"
          >
            🏛️ Manage Provinces
          </button>
          <button
            onClick={() => setShowEventsPanel(true)}
            className={`btn-primary text-sm relative ${
              activeEvents && activeEvents.length > 0 
                ? "bg-orange-600 hover:bg-orange-700 animate-pulse" 
                : ""
            }`}
          >
            📜 Events
            {activeEvents && activeEvents.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeEvents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowCombatPanel(true)}
            className={`btn-primary text-sm relative ${
              activeRaids && activeRaids.length > 0 
                ? "bg-red-600 hover:bg-red-700 animate-pulse" 
                : ""
            }`}
          >
            ⚔️ Combat
            {activeRaids && activeRaids.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeRaids.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowTechnologiesPanel(true)}
            className="btn-primary text-sm"
          >
            🔬 Technologies
          </button>
          {currentSeason && (
            <button
              onClick={() => setShowRankingsPanel(true)}
              className="btn-primary text-sm"
            >
              🏆 Classements
            </button>
          )}
          <button
            onClick={() => setShowAlliancesPanel(true)}
            className={`btn-primary text-sm relative ${
              myInvitations && myInvitations.length > 0 
                ? "bg-purple-600 hover:bg-purple-700 animate-pulse" 
                : ""
            }`}
          >
            🏰 Alliances
            {myInvitations && myInvitations.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {myInvitations.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowRewardsPanel(true)}
            className="btn-primary text-sm"
          >
            🏆 Récompenses
          </button>
          <button
            onClick={() => setShowSavePanel(true)}
            className="btn-primary text-sm"
          >
            💾 Save Game
          </button>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {Object.entries(productionSummary.resources).map(([resource, amount]) => {
          const resourceType = resource as ResourceType;
          const hourlyRate = productionSummary.productionRates[resourceType];
          
          return (
            <div key={resource} className="card text-center">
              <div className="text-2xl mb-1">
                {RESOURCE_ICONS[resourceType]}
              </div>
              <div className={`text-2xl font-bold mb-1 ${RESOURCE_COLORS[resourceType]}`}>
                {amount.toLocaleString()}
              </div>
              <div className="text-sm text-stone-400 capitalize mb-1">
                {resource.toLowerCase()}
              </div>
              {hourlyRate > 0 && (
                <div className="text-xs text-green-400">
                  +{hourlyRate.toFixed(1)}/hour
                </div>
              )}
              {hourlyRate < 0 && (
                <div className="text-xs text-red-400">
                  {hourlyRate.toFixed(1)}/hour
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Season Information */}
      {currentSeason && (
        <div className="card mb-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🏆 Saison {currentSeason.number}: {currentSeason.name}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-stone-700 rounded p-3">
              <div className="text-stone-400">Thème de Saison</div>
              <div className="text-lg font-semibold text-empire-gold">{currentSeason.theme}</div>
              <div className="text-xs text-stone-500 mt-1">{currentSeason.description}</div>
            </div>
            <div className="bg-stone-700 rounded p-3">
              <div className="text-stone-400">Temps Restant</div>
              <div className="text-lg font-semibold text-orange-400">
                {currentSeason.daysRemaining !== null ? `${currentSeason.daysRemaining} jours` : 'Indéfini'}
              </div>
              <div className="text-xs text-stone-500 mt-1">
                {currentSeason.isActive ? 'Saison Active' : 'Saison Terminée'}
              </div>
            </div>
            <div className="bg-stone-700 rounded p-3">
              <div className="text-stone-400">Votre Progression</div>
              {mySeasonProgress ? (
                <>
                  <div className="text-lg font-semibold text-green-400">
                    {Number(mySeasonProgress.totalPower).toLocaleString()} Power
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    {mySeasonProgress.technologiesCount} tech • {mySeasonProgress.combatVictories} victoires
                  </div>
                </>
              ) : (
                <div className="text-lg font-semibold text-stone-400">Non inscrit</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alliance Information */}
      {myAlliance && (
        <div className="card mb-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🏰 Alliance: {myAlliance.alliance.name} [{myAlliance.alliance.tag}]
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-stone-700 rounded p-3">
              <div className="text-stone-400">Votre Rôle</div>
              <div className="text-lg font-semibold text-empire-gold">
                {myAlliance.role === 'LEADER' ? '👑 Chef' : 
                 myAlliance.role === 'OFFICER' ? '🛡️ Officier' : 
                 '🗡️ Membre'}
              </div>
              <div className="text-xs text-stone-500 mt-1">
                Membre depuis {new Date(myAlliance.joinedAt).toLocaleDateString()}
              </div>
            </div>
            <div className="bg-stone-700 rounded p-3">
              <div className="text-stone-400">Membres Actifs</div>
              <div className="text-lg font-semibold text-blue-400">
                {myAlliance.alliance.memberCount}/{myAlliance.alliance.maxMembers}
              </div>
              <div className="text-xs text-stone-500 mt-1">
                Chef: {myAlliance.alliance.leader.username}
              </div>
            </div>
            <div className="bg-stone-700 rounded p-3">
              <div className="text-stone-400">Puissance Totale</div>
              <div className="text-lg font-semibold text-green-400">
                {myAlliance.alliance.totalPowerFormatted}
              </div>
              <div className="text-xs text-stone-500 mt-1">
                Niveau moyen: {myAlliance.alliance.avgLevel.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production Summary */}
      <div className="card mb-6">
        <h3 className="text-xl font-semibold mb-4">📈 Empire Production</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {Object.entries(productionSummary.productionRates).map(([resource, rate]) => {
            if (rate === 0) return null;
            
            const resourceType = resource as ResourceType;
            const isPositive = rate > 0;
            
            return (
              <div key={resource} className="flex items-center justify-between p-2 bg-stone-700 rounded">
                <span className="capitalize">
                  {RESOURCE_ICONS[resourceType]} {resource.toLowerCase()}
                </span>
                <span className={isPositive ? "text-green-400" : "text-red-400"}>
                  {isPositive ? "+" : ""}{rate.toFixed(1)}/h
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Governor Reports */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">📡 Governor Reports</h3>
          <button 
            onClick={() => setShowGovernorsPanel(true)}
            className="text-sm text-empire-gold hover:text-empire-bronze"
          >
            👨‍💼 Manage All
          </button>
        </div>
        {governorsData?.provinces.some(p => p.governor) ? (
          <div className="space-y-3">
            {governorsData.provinces.filter(p => p.governor).map(province => {
              const governor = province.governor!;
              const personalityIcons = {
                CONSERVATIVE: "🛡️",
                AGGRESSIVE: "⚔️",
                MERCHANT: "💰",
                EXPLORER: "🗺️",
              };
              
              return (
                <div key={province.id} className="bg-stone-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{personalityIcons[governor.personality]}</span>
                      <strong className="text-empire-gold">{governor.name}</strong>
                      <span className="text-stone-400">({province.name})</span>
                    </div>
                    <div className="text-xs text-stone-400">
                      Loyalty: {governor.loyalty}% • XP: {governor.xp}
                    </div>
                  </div>
                  <p className="text-sm text-stone-300">
                    {governor.personality === 'CONSERVATIVE' && (
                      `Maintaining steady development with focus on food security. Province has ${province.buildings.length} buildings and is developing conservatively.`
                    )}
                    {governor.personality === 'AGGRESSIVE' && (
                      `Pursuing military expansion opportunities. ${province.constructions.length} projects active, seeking combat readiness.`
                    )}
                    {governor.personality === 'MERCHANT' && (
                      `Optimizing trade networks and gold production. Economic focus with ${Object.values(province.resources).reduce((sum, amount) => sum + amount, 0).toLocaleString()} total resources managed.`
                    )}
                    {governor.personality === 'EXPLORER' && (
                      `Investigating new technologies and expansion possibilities. Academic pursuits advancing provincial knowledge.`
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-stone-400 text-center py-4">
            No governors assigned to provinces yet.
            <br />
            <button 
              onClick={() => setShowGovernorsPanel(true)}
              className="text-empire-gold hover:text-empire-bronze mt-2"
            >
              👨‍💼 Assign Governors
            </button>
          </div>
        )}
      </div>

      {/* Tasks Panel */}
      <div className="mb-6">
        <TasksPanel />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={() => setShowBuildPanel(true)}
          className="btn-primary"
        >
          🏗️ Build & Upgrade
        </button>
        <button 
          onClick={() => setShowExplorationPanel(true)}
          className="btn-primary"
        >
          🗺️ Explore Territory
        </button>
        <button 
          onClick={() => setShowGovernorsPanel(true)}
          className="btn-primary"
        >
          👨‍💼 Manage Governors
        </button>
        <button onClick={onLogout} className="btn-secondary">
          Logout
        </button>
      </div>

      {/* Build Panel Modal */}
      <BuildPanel 
        isOpen={showBuildPanel} 
        onClose={() => setShowBuildPanel(false)} 
      />
      
      {/* Governors Panel Modal */}
      <GovernorsPanel 
        isOpen={showGovernorsPanel} 
        onClose={() => setShowGovernorsPanel(false)} 
      />
      
      {/* Exploration Panel Modal */}
      <ExplorationPanel 
        isOpen={showExplorationPanel} 
        onClose={() => setShowExplorationPanel(false)} 
      />
      
      {/* Provinces Panel Modal */}
      <ProvincesPanel 
        isOpen={showProvincesPanel} 
        onClose={() => setShowProvincesPanel(false)} 
      />
      
      {/* Save Panel Modal */}
      <SavePanel 
        isOpen={showSavePanel} 
        onClose={() => setShowSavePanel(false)} 
      />
      
      {/* Events Panel Modal */}
      <EventsPanel 
        isOpen={showEventsPanel} 
        onClose={() => setShowEventsPanel(false)} 
      />
      
      {/* Combat Panel Modal */}
      <CombatPanel 
        isOpen={showCombatPanel} 
        onClose={() => setShowCombatPanel(false)} 
      />
      
      {/* Technologies Panel Modal */}
      <TechnologiesPanel 
        isOpen={showTechnologiesPanel} 
        onClose={() => setShowTechnologiesPanel(false)} 
      />
      
      {/* Rankings Panel Modal */}
      <RankingsPanel 
        isOpen={showRankingsPanel} 
        onClose={() => setShowRankingsPanel(false)} 
      />
      
      {/* Alliances Panel Modal */}
      <AlliancesPanel 
        isOpen={showAlliancesPanel} 
        onClose={() => setShowAlliancesPanel(false)} 
      />
      
      {/* Rewards Panel Modal */}
      {showRewardsPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-auto m-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">Système de Récompenses</h2>
              <button
                onClick={() => setShowRewardsPanel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <RewardsPanel />
          </div>
        </div>
      )}
    </div>
  );
}