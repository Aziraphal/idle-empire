"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function RewardsPanel() {
  const [activeTab, setActiveTab] = useState("titles");
  
  const { data: userRewards, isLoading } = trpc.rewards.getUserRewards.useQuery();
  const { data: activeTitle } = trpc.rewards.getActiveTitle.useQuery();
  const { data: userBonuses } = trpc.rewards.getUserBonuses.useQuery();

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
    { id: "achievements", label: "Succès", count: userRewards?.achievements.length || 0 },
    { id: "bonuses", label: "Bonus", count: userRewards?.bonuses.length || 0 },
    { id: "cosmetics", label: "Cosmétiques", count: userRewards?.cosmetics.length || 0 },
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
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-lg font-semibold mb-2">Système de Récompenses</h3>
          <p className="text-sm text-gray-600 mb-4">
            Le système de récompenses est en cours de développement.
          </p>
          <button
            onClick={() => initializeRewardsMutation.mutate()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Initialiser
          </button>
        </div>
      </div>
    </div>
  );
}