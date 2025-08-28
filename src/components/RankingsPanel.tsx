import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { RankingType } from "@prisma/client";

interface RankingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const RANKING_TYPES = [
  { key: RankingType.TOTAL_POWER, name: "Puissance Totale", icon: "⚡" },
  { key: RankingType.GROWTH_7D, name: "Croissance 7j", icon: "📈" },
  { key: RankingType.GROWTH_30D, name: "Croissance 30j", icon: "📊" },
  { key: RankingType.TECHNOLOGIES, name: "Technologies", icon: "🔬" },
  { key: RankingType.COMBAT, name: "Victoires", icon: "⚔️" },
  { key: RankingType.BUILDINGS, name: "Constructions", icon: "🏗️" },
] as const;

export default function RankingsPanel({ isOpen, onClose }: RankingsPanelProps) {
  const [selectedRanking, setSelectedRanking] = useState<RankingType>(RankingType.TOTAL_POWER);

  const { data: currentSeason } = trpc.seasons.getCurrentSeason.useQuery();
  const { data: leaderboard, refetch: refetchLeaderboard } = trpc.seasons.getLeaderboard.useQuery(
    {
      rankingType: selectedRanking,
      limit: 50,
    },
    { enabled: isOpen }
  );

  const { data: myRanking } = trpc.seasons.getMyRanking.useQuery(
    {
      rankingType: selectedRanking,
    },
    { enabled: isOpen }
  );

  const updateRankingsMutation = trpc.seasons.updateRankings.useMutation({
    onSuccess: () => {
      refetchLeaderboard();
    },
  });

  const handleUpdateRankings = async () => {
    try {
      await updateRankingsMutation.mutateAsync({
        rankingType: selectedRanking,
      });
    } catch (error) {
      console.error("Failed to update rankings:", error);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400"; // Gold
    if (rank === 2) return "text-gray-300"; // Silver
    if (rank === 3) return "text-orange-400"; // Bronze
    if (rank <= 10) return "text-green-400"; // Top 10
    if (rank <= 100) return "text-blue-400"; // Top 100
    return "text-stone-400"; // Everyone else
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    if (rank <= 10) return "🏆";
    return "📍";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-stone-800 rounded-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-stone-600">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-empire-gold flex items-center gap-2">
                🏆 Classements
              </h2>
              {currentSeason && (
                <p className="text-stone-400 mt-1">
                  Saison {currentSeason.number}: {currentSeason.name}
                </p>
              )}
            </div>
            <button 
              onClick={onClose}
              className="text-stone-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Ranking Type Selector */}
          <div className="flex flex-wrap gap-2 mt-4">
            {RANKING_TYPES.map((type) => (
              <button
                key={type.key}
                onClick={() => setSelectedRanking(type.key)}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  selectedRanking === type.key
                    ? 'bg-empire-gold text-stone-900'
                    : 'text-stone-300 hover:text-white border border-stone-600'
                }`}
              >
                {type.icon} {type.name}
              </button>
            ))}
          </div>

          {/* My Ranking */}
          {myRanking && (
            <div className="mt-4 bg-stone-700 bg-opacity-50 rounded-lg p-3">
              <div className="text-sm text-stone-400">Votre Position</div>
              <div className="flex items-center gap-3">
                <span className={`text-2xl ${getRankColor(myRanking.rank)}`}>
                  {getRankIcon(myRanking.rank)} #{myRanking.rank}
                </span>
                <div>
                  <div className="font-semibold text-empire-gold">
                    {(myRanking as any).scoreFormatted || Number(myRanking.score).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              🏅 Top {leaderboard?.length || 0} - {RANKING_TYPES.find(t => t.key === selectedRanking)?.name}
            </h3>
            <button
              onClick={handleUpdateRankings}
              disabled={updateRankingsMutation.isLoading}
              className="btn-secondary text-sm"
            >
              {updateRankingsMutation.isLoading ? "Mise à jour..." : "🔄 Actualiser"}
            </button>
          </div>

          {!leaderboard || leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl text-stone-300 mb-2">Aucun Classement</h3>
              <p className="text-stone-500">
                Les classements seront disponibles une fois que les joueurs auront commencé à progresser.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`border rounded-lg p-4 transition-all ${
                    entry.rank <= 3
                      ? 'border-empire-gold bg-empire-gold bg-opacity-10'
                      : entry.rank <= 10
                      ? 'border-green-600 bg-green-900 bg-opacity-10'
                      : 'border-stone-600 hover:border-stone-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className={`text-2xl font-bold ${getRankColor(entry.rank)}`}>
                        {getRankIcon(entry.rank)} #{entry.rank}
                      </div>
                      
                      {/* Player Info */}
                      <div>
                        <h4 className="font-semibold text-lg text-empire-gold">
                          {entry.user.username}
                        </h4>
                        <div className="text-sm text-stone-400">
                          Membre depuis {new Date(entry.user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Score */}
                    <div className="text-right">
                      <div className="text-xl font-bold text-stone-200">
                        {entry.scoreFormatted}
                      </div>
                      <div className="text-xs text-stone-500">
                        Mis à jour {new Date(entry.snapshotAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}