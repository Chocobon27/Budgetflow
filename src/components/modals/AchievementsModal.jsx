import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ALL_ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, getLevel, getXpInLevel, getXpForNextLevel, getLevelTitle } from '../../hooks/useAchievements';

const AchievementsModal = ({ onClose }) => {
  const { darkMode, achievements } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const points = achievements.points || 0;
  const level = getLevel(points);
  const xpInLevel = getXpInLevel(points);
  const xpNeeded = getXpForNextLevel();
  const levelTitle = getLevelTitle(level);
  const unlockedIds = new Set((achievements.unlocked || []).map(a => a.id));
  const totalBadges = ALL_ACHIEVEMENTS.length;
  const unlockedCount = unlockedIds.size;
  const progressPercent = Math.round((unlockedCount / totalBadges) * 100);

  // Filtrer les badges par catégorie
  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'all') return ALL_ACHIEVEMENTS;
    return ALL_ACHIEVEMENTS.filter(a => a.category === selectedCategory);
  }, [selectedCategory]);

  // Stats par catégorie
  const categoryStats = useMemo(() => {
    const stats = {};
    Object.keys(ACHIEVEMENT_CATEGORIES).forEach(cat => {
      const catAchievements = ALL_ACHIEVEMENTS.filter(a => a.category === cat);
      const catUnlocked = catAchievements.filter(a => unlockedIds.has(a.id));
      stats[cat] = { total: catAchievements.length, unlocked: catUnlocked.length };
    });
    return stats;
  }, [unlockedIds]);

  // Trouver la date de déblocage d'un badge
  const getUnlockedDate = (achievementId) => {
    const found = (achievements.unlocked || []).find(a => a.id === achievementId);
    if (!found) return null;
    return new Date(found.unlockedAt).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  // Prochain badge le plus proche
  const nextAchievements = useMemo(() => {
    return ALL_ACHIEVEMENTS
      .filter(a => !unlockedIds.has(a.id))
      .slice(0, 3);
  }, [unlockedIds]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header avec niveau */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 opacity-90" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAyMGgyMHYyMEgweiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvc3ZnPg==')] opacity-50" />
          
          <div className="relative p-6">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
            >
              ✕
            </button>

            {/* Niveau et titre */}
            <div className="text-center text-white mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/20 text-sm font-medium mb-3">
                {levelTitle}
              </div>
              <h2 className="text-3xl font-bold mb-1">Niveau {level}</h2>
              <p className="text-white/80 text-sm">{points} points totaux</p>
            </div>

            {/* Barre XP */}
            <div className="max-w-xs mx-auto">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>{xpInLevel} XP</span>
                <span>{xpNeeded} XP</span>
              </div>
              <div className="h-3 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-1000 ease-out"
                  style={{ width: `${(xpInLevel / xpNeeded) * 100}%` }}
                />
              </div>
            </div>

            {/* Stats rapides */}
            <div className="flex justify-center gap-6 mt-4 text-white">
              <div className="text-center">
                <p className="text-2xl font-bold">{unlockedCount}</p>
                <p className="text-xs text-white/70">Badges</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{achievements.streak || 0}</p>
                <p className="text-xs text-white/70">🔥 Streak</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{progressPercent}%</p>
                <p className="text-xs text-white/70">Complété</p>
              </div>
            </div>
          </div>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto max-h-[55vh] p-6">
          {/* Prochains badges */}
          {nextAchievements.length > 0 && (
            <div className="mb-6">
              <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                🎯 Prochains objectifs
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {nextAchievements.map(a => (
                  <div
                    key={a.id}
                    className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-amber-50 border-amber-200'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{a.icon}</span>
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{a.name}</span>
                    </div>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{a.description}</p>
                    <span className="text-xs text-amber-500 font-medium">+{a.points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtres par catégorie */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tous ({unlockedCount}/{totalBadges})
            </button>
            {Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === key
                    ? 'text-white'
                    : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selectedCategory === key ? { backgroundColor: cat.color } : {}}
              >
                {cat.icon} {cat.name} ({categoryStats[key]?.unlocked}/{categoryStats[key]?.total})
              </button>
            ))}
          </div>

          {/* Grille de badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredAchievements.map(achievement => {
              const unlocked = unlockedIds.has(achievement.id);
              const unlockedDate = getUnlockedDate(achievement.id);
              const catInfo = ACHIEVEMENT_CATEGORIES[achievement.category];

              return (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-xl border transition-all ${
                    unlocked
                      ? darkMode
                        ? 'bg-slate-700/80 border-slate-600'
                        : 'bg-white border-gray-200 shadow-sm'
                      : darkMode
                        ? 'bg-slate-800/50 border-slate-700 opacity-50'
                        : 'bg-gray-50 border-gray-100 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icône */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                        unlocked ? '' : 'grayscale'
                      }`}
                      style={{ backgroundColor: unlocked ? `${catInfo.color}20` : undefined }}
                    >
                      {unlocked ? achievement.icon : '🔒'}
                    </div>

                    {/* Détails */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'} ${!unlocked ? 'opacity-60' : ''}`}>
                          {achievement.name}
                        </h4>
                        {unlocked && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium text-white"
                            style={{ backgroundColor: catInfo.color }}
                          >
                            +{achievement.points}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {achievement.description}
                      </p>
                      {unlocked && unlockedDate && (
                        <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                          ✓ Débloqué le {unlockedDate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementsModal;
