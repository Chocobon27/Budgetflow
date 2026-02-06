import React, { useState, useEffect } from 'react';

export default function OfflineIndicator({ isOnline, pendingCount, isSyncing, darkMode }) {
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Rien à afficher si tout va bien
  if (isOnline && !isSyncing && pendingCount === 0 && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] transition-all duration-300">
      {/* Barre hors-ligne */}
      {!isOnline && (
        <div className="bg-amber-500/90 backdrop-blur-sm px-4 py-2 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-950 text-sm font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-900 animate-pulse" />
            <span>Mode hors-ligne</span>
            {pendingCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-amber-900/20 rounded-full text-xs">
                {pendingCount} action{pendingCount > 1 ? 's' : ''} en attente
              </span>
            )}
          </div>
        </div>
      )}

      {/* Barre de synchronisation */}
      {isOnline && isSyncing && (
        <div className="bg-blue-500/90 backdrop-blur-sm px-4 py-2 text-center">
          <div className="flex items-center justify-center gap-2 text-white text-sm font-medium">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Synchronisation en cours... ({pendingCount} restante{pendingCount > 1 ? 's' : ''})</span>
          </div>
        </div>
      )}

      {/* Barre reconnexion */}
      {isOnline && showReconnected && !isSyncing && (
        <div className="bg-emerald-500/90 backdrop-blur-sm px-4 py-2 text-center">
          <div className="flex items-center justify-center gap-2 text-emerald-950 text-sm font-medium">
            <span>✅ Connexion rétablie</span>
          </div>
        </div>
      )}

      {/* Actions en attente (en ligne mais pas encore sync) */}
      {isOnline && !isSyncing && !showReconnected && pendingCount > 0 && (
        <div className="bg-orange-500/90 backdrop-blur-sm px-4 py-2 text-center">
          <div className="flex items-center justify-center gap-2 text-orange-950 text-sm font-medium">
            <span>⏳ {pendingCount} action{pendingCount > 1 ? 's' : ''} en attente de synchronisation</span>
          </div>
        </div>
      )}
    </div>
  );
}
