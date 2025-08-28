import { trpc } from "@/lib/trpc";
import { useState } from "react";

interface EventsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const RARITY_COLORS = {
  COMMON: "text-gray-400 border-gray-600",
  UNCOMMON: "text-green-400 border-green-600", 
  RARE: "text-blue-400 border-blue-600",
  LEGENDARY: "text-purple-400 border-purple-600"
} as const;

const RARITY_BACKGROUNDS = {
  COMMON: "bg-gray-900 bg-opacity-20",
  UNCOMMON: "bg-green-900 bg-opacity-20",
  RARE: "bg-blue-900 bg-opacity-20", 
  LEGENDARY: "bg-purple-900 bg-opacity-20"
} as const;

export default function EventsPanel({ isOpen, onClose }: EventsPanelProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const { data: activeEvents, refetch: refetchEvents } = trpc.events.getActiveEvents.useQuery(
    undefined,
    { enabled: isOpen }
  );

  const resolveEventMutation = trpc.events.resolveEvent.useMutation({
    onSuccess: () => {
      refetchEvents();
      setSelectedEventId(null);
      setResolving(false);
    },
    onError: (error) => {
      alert(`Error resolving event: ${error.message}`);
      setResolving(false);
    }
  });

  const handleResolveEvent = async (eventId: string, choiceId: string) => {
    setResolving(true);
    resolveEventMutation.mutate({ eventId, choiceId });
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
      <div className="bg-stone-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-stone-600">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-empire-gold flex items-center gap-2">
              📜 Empire Events
            </h2>
            <button 
              onClick={onClose}
              className="text-stone-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!activeEvents || activeEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🌅</div>
              <h3 className="text-xl text-stone-300 mb-2">All is Peaceful</h3>
              <p className="text-stone-500">
                No events require your attention at this time. Your empire develops quietly...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeEvents.map((event) => {
                const eventData = event.eventData;
                if (!eventData) return null;

                const isSelected = selectedEventId === event.id;
                const rarityColor = RARITY_COLORS[event.rarity];
                const rarityBg = RARITY_BACKGROUNDS[event.rarity];

                return (
                  <div
                    key={event.id}
                    className={`border rounded-lg p-6 transition-all duration-200 ${rarityColor} ${rarityBg} ${
                      isSelected ? 'ring-2 ring-empire-gold' : 'hover:border-empire-gold'
                    }`}
                  >
                    {/* Event Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{event.imageIcon}</div>
                        <div>
                          <h3 className="text-xl font-bold text-empire-gold">
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-stone-400">
                            <span>📍 {event.provinceName}</span>
                            <span>•</span>
                            <span className={RARITY_COLORS[event.rarity]}>
                              {event.rarity}
                            </span>
                            <span>•</span>
                            <span>
                              ⏰ {new Date(event.triggeredAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {event.expiresAt && (
                        <div className="text-right text-sm text-orange-400">
                          <div>⏳ Expires</div>
                          <div>{new Date(event.expiresAt).toLocaleString()}</div>
                        </div>
                      )}
                    </div>

                    {/* Event Description */}
                    <p className="text-stone-300 mb-6 leading-relaxed">
                      {event.description}
                    </p>

                    {/* Event Choices */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-stone-200 mb-3">Choose your response:</h4>
                      
                      {eventData.choices.map((choice) => (
                        <div
                          key={choice.id}
                          className="border border-stone-600 rounded-lg p-4 hover:border-stone-500 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="font-semibold text-empire-gold mb-2">
                                {choice.text}
                              </h5>
                              <p className="text-stone-400 text-sm mb-3">
                                {choice.description}
                              </p>
                              
                              {/* Costs */}
                              {choice.cost && (
                                <div className="flex gap-3 mb-2">
                                  <span className="text-xs text-stone-500">Costs:</span>
                                  {Object.entries(choice.cost).map(([resource, amount]) => 
                                    formatResourceChange(-amount, resource)
                                  )}
                                </div>
                              )}
                              
                              {/* Potential Gains */}
                              {choice.outcome.resources && (
                                <div className="flex gap-3 mb-2">
                                  <span className="text-xs text-stone-500">Gains:</span>
                                  {Object.entries(choice.outcome.resources).map(([resource, amount]) => 
                                    formatResourceChange(amount, resource)
                                  )}
                                </div>
                              )}
                              
                              {/* Governor Effects */}
                              {(choice.outcome.governorLoyalty || choice.outcome.governorXP) && (
                                <div className="flex gap-3 text-sm">
                                  <span className="text-xs text-stone-500">Governor:</span>
                                  {choice.outcome.governorLoyalty && (
                                    <span className={choice.outcome.governorLoyalty > 0 ? "text-green-400" : "text-red-400"}>
                                      💝 {choice.outcome.governorLoyalty > 0 ? "+" : ""}{choice.outcome.governorLoyalty}% loyalty
                                    </span>
                                  )}
                                  {choice.outcome.governorXP && (
                                    <span className="text-blue-400">
                                      ⭐ +{choice.outcome.governorXP} XP
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Action Button */}
                            <button
                              onClick={() => handleResolveEvent(event.id, choice.id)}
                              disabled={resolving}
                              className="btn-primary ml-4 whitespace-nowrap disabled:opacity-50"
                            >
                              {resolving ? "Resolving..." : "Choose"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Event Requirements */}
                    {eventData.requirements && (
                      <div className="mt-4 p-3 bg-stone-900 bg-opacity-50 rounded text-xs text-stone-500">
                        <strong>Event unlocked by:</strong> {" "}
                        {eventData.requirements.minProvinces && `${eventData.requirements.minProvinces}+ provinces, `}
                        {eventData.requirements.minBuildings && 
                          Object.entries(eventData.requirements.minBuildings)
                            .map(([building, level]) => `${building} level ${level}+`)
                            .join(", ")
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}