"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TitleRarity, TitleCategory, BonusType, AchievementCategory } from "@prisma/client";
import { FaTrophy, FaStar, FaMedal, FaGift, FaCrown, FaFire, FaGem } from "react-icons/fa";

const rarityColors = {
  [TitleRarity.COMMON]: "text-gray-600",
  [TitleRarity.UNCOMMON]: "text-green-600", 
  [TitleRarity.RARE]: "text-blue-600",
  [TitleRarity.EPIC]: "text-purple-600",
  [TitleRarity.LEGENDARY]: "text-yellow-600",
};

const rarityBgColors = {
  [TitleRarity.COMMON]: "bg-gray-100",
  [TitleRarity.UNCOMMON]: "bg-green-100",
  [TitleRarity.RARE]: "bg-blue-100", 
  [TitleRarity.EPIC]: "bg-purple-100",
  [TitleRarity.LEGENDARY]: "bg-yellow-100",
};

const categoryIcons = {
  [TitleCategory.SEASONAL]: FaGem,
  [TitleCategory.ACHIEVEMENT]: FaTrophy,
  [TitleCategory.ALLIANCE]: FaFire,
  [TitleCategory.SPECIAL]: FaCrown,
  [TitleCategory.FOUNDER]: FaStar,
};

export default function RewardsPanel() {
  const [activeTab, setActiveTab] = useState("titles");
  
  const { data: userRewards, isLoading } = trpc.rewards.getUserRewards.useQuery();
  const { data: activeTitle } = trpc.rewards.getActiveTitle.useQuery();
  const { data: userBonuses } = trpc.rewards.getUserBonuses.useQuery();
  const { data: allTitles } = trpc.rewards.getAllTitles.useQuery();
  const { data: allAchievements } = trpc.rewards.getAllAchievements.useQuery();
  const { data: leaderboard } = trpc.rewards.getLeaderboard.useQuery({ category: 'titles', limit: 10 });

  const setActiveTitleMutation = trpc.rewards.setActiveTitle.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const initializeRewardsMutation = trpc.rewards.initializeRewards.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const checkAchievementsMutation = trpc.rewards.checkAchievements.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "titles", label: "Titres", count: userRewards?.titles.length || 0 },
    { id: "achievements", label: "Succès", count: userRewards?.achievements.filter(a => a.completedAt).length || 0 },
    { id: "bonuses", label: "Bonus", count: userRewards?.bonuses.length || 0 },
    { id: "cosmetics", label: "Cosmétiques", count: userRewards?.cosmetics.length || 0 },
    { id: "leaderboard", label: "Classement", count: 0 },
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b">
        <nav className="-mb-px flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === "titles" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Mes Titres</h3>
              <div className="text-sm text-gray-600">
                {userRewards?.titles.length || 0} titres débloqués
              </div>
            </div>

            {activeTitle && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800">Titre Actif</h4>
                <div className="flex items-center mt-2">
                  <FaCrown className="text-yellow-600 mr-2" />
                  <span className="font-medium">{activeTitle.name}</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${rarityBgColors[activeTitle.rarity as TitleRarity]} ${rarityColors[activeTitle.rarity as TitleRarity]}`}>
                    {activeTitle.rarity}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{activeTitle.description}</p>
                <button
                  onClick={() => setActiveTitleMutation.mutate({ titleId: null })}
                  className="mt-2 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Retirer le titre
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userRewards?.titles.map((playerTitle) => {
                const IconComponent = categoryIcons[playerTitle.title.category as TitleCategory] || FaStar;
                return (
                  <div
                    key={playerTitle.id}
                    className={`border rounded-lg p-4 ${rarityBgColors[playerTitle.title.rarity as TitleRarity]}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <IconComponent className={`mr-2 ${rarityColors[playerTitle.title.rarity as TitleRarity]}`} />
                        <span className="font-semibold">{playerTitle.title.name}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${rarityColors[playerTitle.title.rarity as TitleRarity]}`}>
                        {playerTitle.title.rarity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{playerTitle.title.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Débloqué le {new Date(playerTitle.unlockedAt).toLocaleDateString()}
                      </span>
                      {activeTitle?.id !== playerTitle.title.id && (
                        <button
                          onClick={() => setActiveTitleMutation.mutate({ titleId: playerTitle.title.id })}
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Équiper
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {(!userRewards?.titles || userRewards.titles.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <FaTrophy className="mx-auto text-4xl mb-4 opacity-50" />
                <p>Aucun titre débloqué pour le moment</p>
                <button
                  onClick={() => initializeRewardsMutation.mutate()}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Initialiser les récompenses
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Mes Succès</h3>
              <button
                onClick={() => checkAchievementsMutation.mutate()}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Vérifier les succès
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allAchievements?.map((achievement) => {
                const playerAchievement = userRewards?.achievements.find(pa => pa.achievementId === achievement.id);
                const isCompleted = playerAchievement?.completedAt;
                const progress = playerAchievement?.currentProgress || 0;
                const progressPercentage = Math.min((progress / achievement.targetValue) * 100, 100);

                return (
                  <div
                    key={achievement.id}
                    className={`border rounded-lg p-4 ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{achievement.name}</span>
                      {isCompleted && <FaTrophy className="text-yellow-500" />}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{achievement.description}</p>
                    
                    <div className="mb-2">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progression</span>
                        <span>{progress} / {achievement.targetValue}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {isCompleted && (
                      <div className="text-xs text-green-600">
                        Complété le {new Date(playerAchievement!.completedAt!).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "bonuses" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Mes Bonus Permanents</h3>
            
            {userBonuses && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-3">Bonus Actifs</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Production:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      +{((userBonuses.productionMultiplier - 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Ressources:</span>
                    <span className="ml-2 font-semibold text-blue-600">
                      +{userBonuses.resourceBonus.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Combat:</span>
                    <span className="ml-2 font-semibold text-red-600">
                      +{(userBonuses.combatBonus * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userRewards?.bonuses.map((playerBonus) => (
                <div key={playerBonus.id} className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{playerBonus.bonus.name}</span>
                    <FaGift className="text-green-500" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{playerBonus.bonus.description}</p>
                  <div className="text-xs text-gray-500">
                    Débloqué le {new Date(playerBonus.unlockedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            {(!userRewards?.bonuses || userRewards.bonuses.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <FaGift className="mx-auto text-4xl mb-4 opacity-50" />
                <p>Aucun bonus débloqué pour le moment</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "cosmetics" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Mes Cosmétiques</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userRewards?.cosmetics.map((playerCosmetic) => (
                <div key={playerCosmetic.id} className="border rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{playerCosmetic.cosmetic.name}</span>
                    <FaGem className="text-purple-500" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{playerCosmetic.cosmetic.description}</p>
                  <div className="text-xs text-gray-500">
                    Type: {playerCosmetic.cosmetic.type} • 
                    Débloqué le {new Date(playerCosmetic.unlockedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            {(!userRewards?.cosmetics || userRewards.cosmetics.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <FaGem className="mx-auto text-4xl mb-4 opacity-50" />
                <p>Aucun cosmétique débloqué pour le moment</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Classement des Titres</h3>
            
            <div className="bg-white border rounded-lg">
              <div className="px-4 py-3 border-b bg-gray-50">
                <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-gray-700">
                  <span>Rang</span>
                  <span>Joueur</span>
                  <span>Titres</span>
                  <span>Titre Actif</span>
                </div>
              </div>
              <div className="divide-y">
                {leaderboard?.map((entry, index) => (
                  <div key={entry.id} className="px-4 py-3">
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <div className="flex items-center">
                        <span className={`font-bold ${index < 3 ? 'text-yellow-600' : ''}`}>
                          #{index + 1}
                        </span>
                        {index === 0 && <FaCrown className="ml-2 text-yellow-500" />}
                      </div>
                      <span className="font-medium">{entry.username}</span>
                      <span>{entry.totalTitles} titres</span>
                      <span className="text-sm text-gray-600">
                        {entry.activeTitle?.name || "Aucun"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}