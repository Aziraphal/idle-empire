// React hook for managing save system
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { saveService, type SaveData } from '@/lib/save-service';

export interface SaveStatus {
  isLoading: boolean;
  lastSaveTime: number;
  totalPlayTime: number;
  hasLocalSave: boolean;
  autoSaveEnabled: boolean;
  error: string | null;
}

export function useSaveSystem() {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    isLoading: false,
    lastSaveTime: 0,
    totalPlayTime: 0,
    hasLocalSave: false,
    autoSaveEnabled: true,
    error: null,
  });

  // tRPC queries for fetching current game state
  const { data: empireData } = trpc.empire.getProductionSummary.useQuery();
  const { data: governorsData } = trpc.governors.getGovernors.useQuery();
  const { data: constructionData } = trpc.construction.getTasks.useQuery();

  // Update save status
  const updateSaveStatus = useCallback(() => {
    const info = saveService.getSaveInfo();
    setSaveStatus(prev => ({
      ...prev,
      lastSaveTime: info.lastSaveTime,
      totalPlayTime: info.totalPlayTime,
      hasLocalSave: info.hasLocalSave,
      autoSaveEnabled: info.autoSaveEnabled,
    }));
  }, []);

  // Create save data from current game state
  const createSaveData = useCallback((): SaveData | null => {
    if (!empireData || !governorsData || !constructionData) {
      return null;
    }

    // Get user info from localStorage or create mock
    const userInfo = {
      id: 'demo-user',
      username: 'demo',
    };

    // Convert current game state to save format
    const saveData: SaveData = {
      version: '1.0.0',
      timestamp: Date.now(),
      user: userInfo,
      empire: {
        cities: [{
          id: 'demo-city',
          name: 'Nova Roma',
          provinces: governorsData.provinces.map(province => ({
            id: province.id,
            name: province.name,
            resources: province.resources,
            buildings: province.buildings.map(building => ({
              type: building.type,
              level: building.level,
            })),
            constructions: province.constructions.map(construction => ({
              buildingType: construction.buildingType,
              targetLevel: construction.targetLevel,
              finishesAt: construction.finishesAt.toISOString(),
            })),
            governor: province.governor ? {
              name: province.governor.name,
              personality: province.governor.personality,
              loyalty: province.governor.loyalty,
              xp: province.governor.xp,
            } : null,
          })),
          researches: governorsData.activeResearches.map(research => ({
            techKey: research.techKey,
            finishesAt: research.finishesAt.toISOString(),
          })),
        }],
      },
      gameStats: {
        totalPlayTime: saveService.getSaveInfo().totalPlayTime,
        lastSaveTime: Date.now(),
        totalBuildings: governorsData.provinces.reduce((sum, p) => sum + p.buildings.length, 0),
        totalResources: Object.values(empireData.resources).reduce((sum, amount) => sum + amount, 0),
      },
    };

    return saveData;
  }, [empireData, governorsData, constructionData]);

  // Manual save function
  const saveNow = useCallback(async () => {
    setSaveStatus(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const saveData = createSaveData();
      if (!saveData) {
        throw new Error('No game data available to save');
      }

      const success = saveService.saveToLocalStorage(saveData);
      if (!success) {
        throw new Error('Failed to save game data');
      }

      updateSaveStatus();
      return true;
    } catch (error) {
      setSaveStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
      return false;
    } finally {
      setSaveStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [createSaveData, updateSaveStatus]);

  // Auto-save setup
  useEffect(() => {
    let autoSaveInterval: NodeJS.Timeout;

    if (saveStatus.autoSaveEnabled && empireData && governorsData && constructionData) {
      autoSaveInterval = setInterval(() => {
        saveNow();
      }, 30000); // Auto-save every 30 seconds
    }

    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    };
  }, [saveStatus.autoSaveEnabled, empireData, governorsData, constructionData, saveNow]);

  // Load save function
  const loadSave = useCallback(async () => {
    setSaveStatus(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const saveData = saveService.loadFromLocalStorage();
      if (!saveData) {
        throw new Error('No save data found');
      }

      // Note: In a real implementation, we'd need to restore the game state
      // This would require additional API endpoints to update the database
      console.log('Save data loaded:', saveData);
      
      // For now, show success message to user
      setSaveStatus(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: null 
      }));
      
      updateSaveStatus();
      return saveData;
    } catch (error) {
      setSaveStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      }));
      return null;
    }
  }, [updateSaveStatus]);

  // Export save as JSON
  const exportSave = useCallback(() => {
    try {
      const jsonData = saveService.exportSave();
      if (!jsonData) {
        throw new Error('No save data to export');
      }

      // Create download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `idle-empire-save-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      setSaveStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Export failed' 
      }));
      return false;
    }
  }, []);

  // Import save from JSON
  const importSave = useCallback(async (file: File) => {
    setSaveStatus(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const jsonData = await file.text();
      const success = saveService.importSave(jsonData);
      
      if (!success) {
        throw new Error('Failed to import save data');
      }

      updateSaveStatus();
      return true;
    } catch (error) {
      setSaveStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Import failed' 
      }));
      return false;
    } finally {
      setSaveStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [updateSaveStatus]);

  // Clear all saves
  const clearSaves = useCallback(() => {
    try {
      const success = saveService.clearAllSaves();
      if (success) {
        updateSaveStatus();
      }
      return success;
    } catch (error) {
      setSaveStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Clear failed' 
      }));
      return false;
    }
  }, [updateSaveStatus]);

  // Initialize save status
  useEffect(() => {
    updateSaveStatus();
  }, [updateSaveStatus]);

  return {
    saveStatus,
    saveNow,
    loadSave,
    exportSave,
    importSave,
    clearSaves,
    formatPlayTime: saveService.formatPlayTime,
  };
}