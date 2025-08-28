// Save system for Idle Empire - Local storage with import/export
import { trpc } from "./trpc";

export interface SaveData {
  version: string;
  timestamp: number;
  user: {
    id: string;
    username: string;
  };
  empire: {
    cities: Array<{
      id: string;
      name: string;
      provinces: Array<{
        id: string;
        name: string;
        resources: Record<string, number>;
        buildings: Array<{
          type: string;
          level: number;
        }>;
        constructions: Array<{
          buildingType: string;
          targetLevel: number;
          finishesAt: string;
        }>;
        governor: {
          name: string;
          personality: string;
          loyalty: number;
          xp: number;
        } | null;
      }>;
      researches: Array<{
        techKey: string;
        finishesAt: string;
      }>;
    }>;
  };
  gameStats: {
    totalPlayTime: number;
    lastSaveTime: number;
    totalBuildings: number;
    totalResources: number;
  };
}

const SAVE_KEY = 'idle-empire-save';
const SAVE_VERSION = '1.0.0';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

class SaveService {
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private lastSaveTime: number = 0;
  private totalPlayTime: number = 0;
  private sessionStartTime: number = Date.now();

  constructor() {
    // Load existing play time
    const existingStats = this.getGameStats();
    if (existingStats) {
      this.totalPlayTime = existingStats.totalPlayTime || 0;
    }

    // Start auto-save
    this.startAutoSave();
    
    // Save on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveNow();
      });
    }
  }

  // Start auto-save timer
  startAutoSave() {
    if (this.autoSaveInterval) return;
    
    this.autoSaveInterval = setInterval(async () => {
      await this.saveNow();
    }, AUTO_SAVE_INTERVAL);

    console.log(`💾 Auto-save enabled (every ${AUTO_SAVE_INTERVAL / 1000}s)`);
  }

  // Stop auto-save timer
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Get current game stats
  private getGameStats() {
    try {
      const saved = localStorage.getItem(SAVE_KEY + '-stats');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  // Save game stats
  private saveGameStats(stats: SaveData['gameStats']) {
    try {
      localStorage.setItem(SAVE_KEY + '-stats', JSON.stringify(stats));
    } catch (error) {
      console.error('Failed to save game stats:', error);
    }
  }

  // Fetch current game data from tRPC
  async fetchCurrentGameData(): Promise<SaveData | null> {
    try {
      // We can't directly call tRPC from here, so we'll return null
      // and handle the data fetching in the component
      return null;
    } catch (error) {
      console.error('Failed to fetch game data:', error);
      return null;
    }
  }

  // Save game data to localStorage
  saveToLocalStorage(data: SaveData): boolean {
    try {
      // Compress and save main data
      const compressed = this.compressData(data);
      localStorage.setItem(SAVE_KEY, compressed);
      
      // Update stats
      const currentTime = Date.now();
      const sessionTime = currentTime - this.sessionStartTime;
      this.totalPlayTime += sessionTime;
      this.sessionStartTime = currentTime;
      this.lastSaveTime = currentTime;
      
      const stats: SaveData['gameStats'] = {
        totalPlayTime: this.totalPlayTime,
        lastSaveTime: this.lastSaveTime,
        totalBuildings: data.gameStats.totalBuildings,
        totalResources: data.gameStats.totalResources,
      };
      
      this.saveGameStats(stats);
      
      console.log(`💾 Game saved at ${new Date().toLocaleTimeString()}`);
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  // Load game data from localStorage
  loadFromLocalStorage(): SaveData | null {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) return null;
      
      const data = this.decompressData(saved);
      
      // Validate save version
      if (!data.version || data.version !== SAVE_VERSION) {
        console.warn('Save version mismatch, migration may be needed');
        // For now, return null. In the future, add migration logic
        return null;
      }
      
      console.log(`📁 Game loaded from ${new Date(data.timestamp).toLocaleString()}`);
      return data;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }

  // Export save data as JSON
  exportSave(): string | null {
    try {
      const data = this.loadFromLocalStorage();
      if (!data) return null;
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export save:', error);
      return null;
    }
  }

  // Import save data from JSON
  importSave(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData) as SaveData;
      
      // Validate data structure
      if (!this.validateSaveData(data)) {
        throw new Error('Invalid save data structure');
      }
      
      // Save imported data
      return this.saveToLocalStorage(data);
    } catch (error) {
      console.error('Failed to import save:', error);
      return false;
    }
  }

  // Validate save data structure
  private validateSaveData(data: any): data is SaveData {
    return (
      data &&
      typeof data === 'object' &&
      data.version &&
      data.timestamp &&
      data.user &&
      data.empire &&
      data.gameStats
    );
  }

  // Simple compression (Base64 encoding)
  private compressData(data: SaveData): string {
    try {
      const json = JSON.stringify(data);
      return btoa(unescape(encodeURIComponent(json)));
    } catch {
      return JSON.stringify(data);
    }
  }

  // Simple decompression
  private decompressData(compressed: string): SaveData {
    try {
      const json = decodeURIComponent(escape(atob(compressed)));
      return JSON.parse(json);
    } catch {
      return JSON.parse(compressed);
    }
  }

  // Manual save trigger
  async saveNow(): Promise<boolean> {
    // This will be called from components with actual data
    return false;
  }

  // Get save info for UI
  getSaveInfo() {
    const stats = this.getGameStats();
    const hasLocalSave = !!localStorage.getItem(SAVE_KEY);
    
    return {
      hasLocalSave,
      lastSaveTime: stats?.lastSaveTime || 0,
      totalPlayTime: this.totalPlayTime + (Date.now() - this.sessionStartTime),
      autoSaveEnabled: !!this.autoSaveInterval,
    };
  }

  // Clear all saves
  clearAllSaves(): boolean {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(SAVE_KEY + '-stats');
      console.log('🗑️ All saves cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear saves:', error);
      return false;
    }
  }

  // Format play time for display
  formatPlayTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Singleton instance
export const saveService = new SaveService();