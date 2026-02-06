import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';

// ============================================
// IndexedDB Helper pour le cache offline
// ============================================
const DB_NAME = 'budgetflow_offline';
const DB_VERSION = 1;
const STORE_CACHE = 'cache';
const STORE_PENDING = 'pending';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbOperation = async (storeName, mode, operation) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = operation(store);
      
      if (request) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
      
      tx.oncomplete = () => {
        if (!request) resolve();
        db.close();
      };
      tx.onerror = () => {
        reject(tx.error);
        db.close();
      };
    });
  } catch (error) {
    console.error('IndexedDB error:', error);
    return null;
  }
};

// ============================================
// Hook useOffline
// ============================================
const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // ============================================
  // Détecter online/offline
  // ============================================
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Connexion rétablie');
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      console.log('📡 Connexion perdue');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ============================================
  // Compter les actions en attente
  // ============================================
  const updatePendingCount = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_PENDING, 'readonly');
      const store = tx.objectStore(STORE_PENDING);
      const request = store.count();
      
      request.onsuccess = () => {
        setPendingCount(request.result);
      };
      
      tx.oncomplete = () => db.close();
    } catch (error) {
      console.error('Error counting pending actions:', error);
    }
  }, []);

  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  // ============================================
  // Ajouter une action en file d'attente
  // ============================================
  const addPendingAction = useCallback(async (action) => {
    try {
      const pendingAction = {
        ...action,
        timestamp: Date.now(),
        retries: 0,
      };

      await dbOperation(STORE_PENDING, 'readwrite', (store) => {
        return store.add(pendingAction);
      });

      await updatePendingCount();
      console.log('📋 Action en attente ajoutée:', action.type || action.method);
      return true;
    } catch (error) {
      console.error('Error adding pending action:', error);
      return false;
    }
  }, [updatePendingCount]);

  // ============================================
  // Synchroniser les actions en attente
  // ============================================
  const syncPendingActions = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const db = await openDB();
      const tx = db.transaction(STORE_PENDING, 'readonly');
      const store = tx.objectStore(STORE_PENDING);
      const allActions = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();

      if (allActions.length === 0) {
        syncingRef.current = false;
        setIsSyncing(false);
        return;
      }

      console.log(`🔄 Synchronisation de ${allActions.length} action(s)...`);

      // Trier par timestamp (FIFO)
      const sorted = allActions.sort((a, b) => a.timestamp - b.timestamp);
      const succeeded = [];

      for (const action of sorted) {
        try {
          // Exécuter l'action via l'API
          if (action.endpoint && action.method) {
            await api.request(action.endpoint, {
              method: action.method,
              ...(action.body ? { body: JSON.stringify(action.body) } : {}),
            });
          }
          succeeded.push(action.id);
        } catch (error) {
          console.error(`❌ Sync échouée pour action ${action.id}:`, error);
          // Si trop de retries, on supprime quand même
          if (action.retries >= 3) {
            console.warn(`⚠️ Action ${action.id} supprimée après 3 tentatives`);
            succeeded.push(action.id);
          } else {
            // Incrémenter le compteur de retries
            try {
              await dbOperation(STORE_PENDING, 'readwrite', (store) => {
                return store.put({ ...action, retries: (action.retries || 0) + 1 });
              });
            } catch (e) {
              // Ignorer
            }
          }
        }
      }

      // Supprimer les actions réussies
      if (succeeded.length > 0) {
        const db2 = await openDB();
        const tx2 = db2.transaction(STORE_PENDING, 'readwrite');
        const store2 = tx2.objectStore(STORE_PENDING);
        
        for (const id of succeeded) {
          store2.delete(id);
        }
        
        await new Promise((resolve) => {
          tx2.oncomplete = resolve;
        });
        db2.close();
      }

      console.log(`✅ ${succeeded.length}/${sorted.length} action(s) synchronisée(s)`);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await updatePendingCount();
    }
  }, [updatePendingCount]);

  // ============================================
  // Sync automatique quand on revient en ligne
  // ============================================
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      // Petit délai pour laisser la connexion se stabiliser
      const timer = setTimeout(() => {
        syncPendingActions();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount, syncPendingActions]);

  // ============================================
  // Cache de données (pour lecture hors-ligne)
  // ============================================
  const cacheData = useCallback(async (key, data) => {
    try {
      await dbOperation(STORE_CACHE, 'readwrite', (store) => {
        return store.put({
          key,
          data,
          timestamp: Date.now(),
        });
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }, []);

  const getCachedData = useCallback(async (key) => {
    try {
      const result = await dbOperation(STORE_CACHE, 'readonly', (store) => {
        return store.get(key);
      });
      
      if (result && result.data) {
        // Cache valide pendant 24h
        const maxAge = 24 * 60 * 60 * 1000;
        if (Date.now() - result.timestamp < maxAge) {
          return result.data;
        }
      }
      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }, []);

  // ============================================
  // Nettoyer les données offline
  // ============================================
  const clearOfflineData = useCallback(async () => {
    try {
      await dbOperation(STORE_CACHE, 'readwrite', (store) => {
        return store.clear();
      });
      await dbOperation(STORE_PENDING, 'readwrite', (store) => {
        return store.clear();
      });
      setPendingCount(0);
      console.log('🗑️ Données offline nettoyées');
    } catch (error) {
      console.error('Clear offline data error:', error);
    }
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    addPendingAction,
    syncPendingActions,
    cacheData,
    getCachedData,
    clearOfflineData,
  };
};

export default useOffline;
