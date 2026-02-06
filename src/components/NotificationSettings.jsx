import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

// Convertir une clé VAPID base64 en Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationSettings({ onClose }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preferences, setPreferences] = useState({
    debtReminders: true,
    budgetAlerts: true,
    goalAchieved: true,
    recurringTransactions: true,
    reminderDays: 3,
  });

  // Vérifier support notifications
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
  }, []);

  // Charger statut + préférences
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statusRes, prefsRes] = await Promise.all([
        api.getPushStatus(),
        api.getPushPreferences(),
      ]);
      setIsSubscribed(statusRes.subscribed);
      setPreferences(prefsRes);
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // S'abonner aux notifications push
  const handleSubscribe = async () => {
    setSubscribing(true);
    setError('');
    setSuccess('');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Permission refusée. Activez les notifications dans les paramètres de votre navigateur.');
        setSubscribing(false);
        return;
      }

      // Récupérer la clé VAPID
      const vapidRes = await api.getVapidKey();
      if (!vapidRes.publicKey) {
        setError('Notifications push non configurées sur le serveur.');
        setSubscribing(false);
        return;
      }

      // S'abonner via le Service Worker
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidRes.publicKey),
      });

      // Envoyer au serveur
      const subJson = subscription.toJSON();
      await api.subscribePush({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      });

      setIsSubscribed(true);
      setSuccess('Notifications activées !');
    } catch (err) {
      console.error('Erreur abonnement push:', err);
      setError('Erreur lors de l\'activation des notifications.');
    } finally {
      setSubscribing(false);
    }
  };

  // Se désabonner
  const handleUnsubscribe = async () => {
    setSubscribing(true);
    setError('');
    setSuccess('');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await api.unsubscribePush(subscription.endpoint);
      }

      setIsSubscribed(false);
      setSuccess('Notifications désactivées.');
    } catch (err) {
      console.error('Erreur désabonnement push:', err);
      setError('Erreur lors de la désactivation.');
    } finally {
      setSubscribing(false);
    }
  };

  // Sauvegarder les préférences
  const handleSavePreferences = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.updatePushPreferences(preferences);
      setSuccess('Préférences sauvegardées !');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Erreur sauvegarde préférences:', err);
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            🔔 Notifications
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-4 space-y-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Messages */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
                  {success}
                </div>
              )}

              {/* Activation push */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-2">Notifications Push</h3>

                {!isSupported ? (
                  <p className="text-slate-400 text-sm">
                    Les notifications push ne sont pas supportées par votre navigateur.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-slate-400 text-sm">
                      {isSubscribed
                        ? 'Les notifications push sont activées sur cet appareil.'
                        : 'Activez les notifications pour recevoir des rappels d\'échéances et alertes budget.'}
                    </p>

                    <button
                      onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
                      disabled={subscribing}
                      className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                        isSubscribed
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600'
                      } ${subscribing ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {subscribing
                        ? '...'
                        : isSubscribed
                        ? '🔕 Désactiver les notifications'
                        : '🔔 Activer les notifications'}
                    </button>
                  </div>
                )}
              </div>

              {/* Préférences (visible seulement si abonné) */}
              {isSubscribed && (
                <div className="bg-slate-700/50 rounded-xl p-4 space-y-4">
                  <h3 className="text-white font-semibold">Préférences</h3>

                  {[
                    { key: 'debtReminders', label: 'Rappels d\'échéances', icon: '💳', desc: 'Avant chaque échéance de dette' },
                    { key: 'budgetAlerts', label: 'Alertes budget', icon: '📊', desc: 'Quand un budget est dépassé' },
                    { key: 'goalAchieved', label: 'Objectifs atteints', icon: '🎯', desc: 'Quand un objectif est complété' },
                    { key: 'recurringTransactions', label: 'Transactions récurrentes', icon: '🔄', desc: 'Rappels de paiements récurrents' },
                  ].map(({ key, label, icon, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-white text-sm font-medium">
                          <span>{icon}</span>
                          <span>{label}</span>
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5 ml-7">{desc}</p>
                      </div>
                      <button
                        onClick={() => setPreferences((p) => ({ ...p, [key]: !p[key] }))}
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          preferences[key] ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            preferences[key] ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  ))}

                  {/* Jours avant rappel */}
                  <div className="pt-2 border-t border-slate-600">
                    <label className="text-white text-sm font-medium block mb-2">
                      ⏰ Rappel avant échéance (jours)
                    </label>
                    <div className="flex items-center gap-3">
                      {[1, 2, 3, 5, 7].map((d) => (
                        <button
                          key={d}
                          onClick={() => setPreferences((p) => ({ ...p, reminderDays: d }))}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            preferences.reminderDays === d
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                          }`}
                        >
                          {d}j
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className={`w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-all ${
                      saving ? 'opacity-50 cursor-wait' : ''
                    }`}
                  >
                    {saving ? 'Sauvegarde...' : '💾 Sauvegarder les préférences'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
