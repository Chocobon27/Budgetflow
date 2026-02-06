import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

const AchievementToast = () => {
  const { darkMode, newAchievement, setNewAchievement, setShowAchievementsModal } = useApp();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (newAchievement) {
      setVisible(true);
      setLeaving(false);

      const hideTimer = setTimeout(() => {
        setLeaving(true);
        setTimeout(() => {
          setVisible(false);
          setNewAchievement(null);
        }, 500);
      }, 4000);

      return () => clearTimeout(hideTimer);
    }
  }, [newAchievement, setNewAchievement]);

  if (!visible || !newAchievement) return null;

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${
        leaving ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
      }`}
      style={{ animation: !leaving ? 'achievementSlideIn 0.5s ease-out, achievementGlow 2s ease-in-out infinite' : undefined }}
    >
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border cursor-pointer ${
          darkMode
            ? 'bg-slate-800 border-amber-500/30'
            : 'bg-white border-amber-300'
        }`}
        style={{
          boxShadow: '0 0 30px rgba(245, 158, 11, 0.3), 0 10px 40px rgba(0,0,0,0.2)'
        }}
        onClick={() => {
          setVisible(false);
          setNewAchievement(null);
          setShowAchievementsModal(true);
        }}
      >
        {/* Icône animée */}
        <div
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl flex-shrink-0"
          style={{ animation: 'achievementBounce 0.6s ease-out' }}
        >
          {newAchievement.icon}
        </div>

        {/* Texte */}
        <div>
          <p className={`text-xs font-semibold text-amber-500 uppercase tracking-wider`}>
            🏆 Badge débloqué !
          </p>
          <p className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {newAchievement.name}
          </p>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            +{newAchievement.points} points
          </p>
        </div>

        {/* Sparkles */}
        <div className="text-xl" style={{ animation: 'achievementSpin 1s linear' }}>
          ✨
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes achievementSlideIn {
          0% { transform: translateY(-30px); opacity: 0; }
          60% { transform: translateY(5px); }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes achievementBounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes achievementGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.2), 0 10px 40px rgba(0,0,0,0.2); }
          50% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.4), 0 10px 40px rgba(0,0,0,0.2); }
        }
        @keyframes achievementSpin {
          0% { transform: rotate(0deg) scale(0); opacity: 0; }
          50% { transform: rotate(180deg) scale(1.5); opacity: 1; }
          100% { transform: rotate(360deg) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AchievementToast;
