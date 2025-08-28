"use client";

import React from "react";

export default function RewardsPanelSimple() {
  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-4">🏆 Système de Récompenses</h3>
        <p className="text-gray-600 mb-6">
          Le système de récompenses est en cours de développement.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-800 mb-2">Fonctionnalités prévues :</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Titres avec système de rareté</li>
            <li>• Succès et achievements</li>
            <li>• Bonus permanents de production</li>
            <li>• Cosmétiques et personnalisation</li>
            <li>• Classements entre joueurs</li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Actualiser
        </button>
      </div>
    </div>
  );
}