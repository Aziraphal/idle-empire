import { useState, useRef } from 'react';
import { useSaveSystem } from '@/hooks/useSaveSystem';

interface SavePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SavePanel({ isOpen, onClose }: SavePanelProps) {
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    saveStatus,
    saveNow,
    loadSave,
    exportSave,
    importSave,
    clearSaves,
    formatPlayTime,
  } = useSaveSystem();

  const showMessage = (message: string, type: 'success' | 'error') => {
    setSaveMessage(message);
    setMessageType(type);
    setTimeout(() => {
      setSaveMessage('');
      setMessageType('');
    }, 3000); // Clear message after 3 seconds
  };

  const handleSaveNow = async () => {
    const success = await saveNow();
    if (success) {
      showMessage('Game saved successfully!', 'success');
    } else {
      showMessage('Failed to save game', 'error');
    }
  };

  const handleLoadSave = async () => {
    const result = await loadSave();
    if (result) {
      showMessage('Save loaded successfully! Game state restored.', 'success');
    } else {
      showMessage('Failed to load save data', 'error');
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setShowConfirmClear(false);
    setSaveMessage('');
    setMessageType('');
    onClose();
  };

  if (!isOpen) return null;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const success = await importSave(file);
      if (success) {
        showMessage('Save imported successfully!', 'success');
      } else {
        showMessage('Failed to import save', 'error');
      }
    }
    // Reset file input
    event.target.value = '';
  };

  const handleClearSaves = () => {
    if (clearSaves()) {
      showMessage('All saves cleared!', 'success');
      setShowConfirmClear(false);
    } else {
      showMessage('Failed to clear saves', 'error');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-stone-800 rounded-lg p-4 md:p-6 w-full max-w-4xl max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-empire-gold">💾 Save Management</h2>
          <button
            onClick={handleClose}
            className="text-stone-400 hover:text-white text-xl md:text-2xl"
          >
            ×
          </button>
        </div>

        {/* Save Status */}
        <div className="card mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">📊 Save Status</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 text-sm md:text-base">
            <div className="text-center">
              <div className="text-xl font-bold text-empire-gold">
                {saveStatus.hasLocalSave ? '✅' : '❌'}
              </div>
              <div className="text-stone-400 text-sm">Local Save</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-empire-gold">
                {saveStatus.autoSaveEnabled ? '🔄' : '⏸️'}
              </div>
              <div className="text-stone-400 text-sm">Auto-Save</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-empire-gold">
                {formatPlayTime(saveStatus.totalPlayTime)}
              </div>
              <div className="text-stone-400 text-sm">Play Time</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-empire-gold">
                {saveStatus.lastSaveTime ? new Date(saveStatus.lastSaveTime).toLocaleTimeString() : 'Never'}
              </div>
              <div className="text-stone-400 text-sm">Last Save</div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {saveMessage && (
            <div className={`border rounded p-3 mb-4 ${
              messageType === 'success' 
                ? 'bg-green-900 border-green-600' 
                : 'bg-red-900 border-red-600'
            }`}>
              <div className={`font-semibold ${
                messageType === 'success' ? 'text-green-400' : 'text-red-400'
              }`}>
                {messageType === 'success' ? '✅ Success:' : '❌ Error:'}
              </div>
              <div className={messageType === 'success' ? 'text-green-200' : 'text-red-200'}>
                {saveMessage}
              </div>
            </div>
          )}

          {saveStatus.error && !saveMessage && (
            <div className="bg-red-900 border border-red-600 rounded p-3 mb-4">
              <div className="text-red-400 font-semibold">❌ Error:</div>
              <div className="text-red-200">{saveStatus.error}</div>
            </div>
          )}

          {saveStatus.autoSaveEnabled && (
            <div className="bg-green-900 border border-green-600 rounded p-3">
              <div className="text-green-400 text-sm">
                🔄 Auto-save is active - your progress is automatically saved every 30 seconds
              </div>
            </div>
          )}
        </div>

        {/* Save Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
          {/* Manual Save */}
          <div className="card">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              💾 Manual Save
            </h4>
            <p className="text-stone-300 text-sm mb-3">
              Save your current progress to browser storage
            </p>
            <button
              onClick={handleSaveNow}
              disabled={saveStatus.isLoading}
              className="w-full btn-primary"
            >
              {saveStatus.isLoading ? 'Saving...' : '💾 Save Now'}
            </button>
          </div>

          {/* Load Save */}
          <div className="card">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              📁 Load Save
            </h4>
            <p className="text-stone-300 text-sm mb-3">
              Restore from your local browser storage
            </p>
            <button
              onClick={handleLoadSave}
              disabled={saveStatus.isLoading || !saveStatus.hasLocalSave}
              className={`w-full ${
                saveStatus.hasLocalSave ? 'btn-secondary' : 'bg-stone-600 text-stone-400 cursor-not-allowed'
              }`}
            >
              {saveStatus.isLoading ? 'Loading...' : saveStatus.hasLocalSave ? '📁 Load Save' : 'No Save Found'}
            </button>
          </div>
        </div>

        {/* Import/Export */}
        <div className="card mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">📤 Import / Export</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {/* Export */}
            <div>
              <h4 className="font-medium mb-2">📤 Export Save</h4>
              <p className="text-stone-300 text-sm mb-3">
                Download your save as a JSON file for backup or sharing
              </p>
              <button
                onClick={exportSave}
                disabled={!saveStatus.hasLocalSave}
                className={`w-full ${
                  saveStatus.hasLocalSave ? 'btn-secondary' : 'bg-stone-600 text-stone-400 cursor-not-allowed'
                }`}
              >
                📥 Download Save
              </button>
            </div>

            {/* Import */}
            <div>
              <h4 className="font-medium mb-2">📥 Import Save</h4>
              <p className="text-stone-300 text-sm mb-3">
                Upload a save file to restore your progress
              </p>
              <button
                onClick={handleImportClick}
                disabled={saveStatus.isLoading}
                className="w-full btn-secondary"
              >
                📤 Upload Save
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="card">
          <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">⚙️ Advanced Options</h3>
          
          {!showConfirmClear ? (
            <div>
              <p className="text-stone-300 text-sm mb-3">
                ⚠️ Danger Zone: Clear all saved data permanently
              </p>
              <button
                onClick={() => setShowConfirmClear(true)}
                className="btn-secondary bg-red-900 border-red-600 hover:bg-red-800"
              >
                🗑️ Clear All Saves
              </button>
            </div>
          ) : (
            <div>
              <p className="text-red-300 text-sm mb-3">
                ⚠️ This will permanently delete all your saved progress. Are you sure?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleClearSaves}
                  className="btn-secondary bg-red-900 border-red-600 hover:bg-red-800"
                >
                  Yes, Delete All
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="card mt-6 bg-stone-700">
          <h3 className="text-base md:text-lg font-semibold mb-3">💡 How Saving Works</h3>
          <div className="text-xs md:text-sm text-stone-300 space-y-2">
            <p>
              <strong>🔄 Auto-Save:</strong> Your progress is automatically saved every 30 seconds to your browser's local storage.
            </p>
            <p>
              <strong>💾 Manual Save:</strong> You can also save manually at any time using the "Save Now" button.
            </p>
            <p>
              <strong>📤 Export/Import:</strong> Download your saves as JSON files for backup or to transfer between devices.
            </p>
            <p>
              <strong>🌐 Browser Storage:</strong> Saves are stored locally in your browser. Clearing browser data will delete saves.
            </p>
            <p>
              <strong>⚠️ Important:</strong> Always export your save before clearing browser data or switching devices!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}