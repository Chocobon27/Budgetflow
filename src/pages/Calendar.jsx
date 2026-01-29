import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getDaysInMonth, getFirstDayOfMonth } from '../utils/helpers';
import { MONTHS_FR } from '../constants';

const Calendar = ({ onDeleteTransaction }) => {
  const {
    darkMode,
    transactions,
    allCategories
  } = useApp();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);

  const getCategoryInfo = (categoryId) => {
    return allCategories.find(c => c.id === categoryId) || {
      id: categoryId,
      name: 'Autre',
      icon: '📌',
      color: '#6B7280'
    };
  };

  // Stats du mois sélectionné
  const getMonthlyData = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const monthlyTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    const income = monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    return { income, expenses, balance: income - expenses, transactions: monthlyTransactions };
  }, [transactions, selectedDate]);

  return (
    <div className="space-y-4">
      {/* Header du calendrier */}
      <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500/30' : 'bg-gradient-to-r from-purple-100 to-pink-100 border-purple-200'} border backdrop-blur-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
              className={`p-3 rounded-xl ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/50 hover:bg-white/80'} transition-all`}
            >
              ◀
            </button>
            <div className="text-center">
              <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {MONTHS_FR[selectedDate.getMonth()]}
              </h3>
              <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                {selectedDate.getFullYear()}
              </p>
            </div>
            <button
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
              className={`p-3 rounded-xl ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white/50 hover:bg-white/80'} transition-all`}
            >
              ▶
            </button>
          </div>
          <button
            onClick={() => setSelectedDate(new Date())}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/50 hover:bg-white/80 text-purple-700'} transition-all`}
          >
            📍 Aujourd'hui
          </button>
        </div>

        {/* Stats du mois */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-white/50'}`}>
            <p className={`text-xs ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>Revenus</p>
            <p className={`text-lg font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>+{formatCurrency(getMonthlyData.income)}</p>
          </div>
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-white/50'}`}>
            <p className={`text-xs ${darkMode ? 'text-rose-300' : 'text-rose-600'}`}>Dépenses</p>
            <p className={`text-lg font-bold ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>-{formatCurrency(getMonthlyData.expenses)}</p>
          </div>
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-white/5' : 'bg-white/50'}`}>
            <p className={`text-xs ${darkMode ? 'text-cyan-300' : 'text-cyan-600'}`}>Solde</p>
            <p className={`text-lg font-bold ${getMonthlyData.balance >= 0 ? (darkMode ? 'text-cyan-400' : 'text-cyan-600') : (darkMode ? 'text-orange-400' : 'text-orange-600')}`}>
              {formatCurrency(getMonthlyData.balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Grille du calendrier */}
      <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => (
            <div
              key={day}
              className={`text-center py-2 rounded-lg text-sm font-semibold ${
                index >= 5
                  ? (darkMode ? 'text-purple-400 bg-purple-500/10' : 'text-purple-600 bg-purple-50')
                  : (darkMode ? 'text-slate-400' : 'text-gray-500')
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Jours du mois */}
        <div className="grid grid-cols-7 gap-2">
          {(() => {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const daysInMonth = getDaysInMonth(year, month);
            const firstDay = getFirstDayOfMonth(year, month);
            const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
            const cells = [];

            // Cellules vides
            for (let i = 0; i < adjustedFirstDay; i++) {
              cells.push(
                <div key={`empty-${i}`} className={`aspect-square rounded-xl ${darkMode ? 'bg-slate-800/30' : 'bg-gray-50'}`} />
              );
            }

            // Jours du mois
            for (let day = 1; day <= daysInMonth; day++) {
              const dayTransactions = transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getFullYear() === year && tDate.getMonth() === month && tDate.getDate() === day;
              });
              const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
              const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;
              const hasTransactions = dayTransactions.length > 0;

              cells.push(
                <div
                  key={day}
                  onClick={() => {
                    setSelectedDay({ day, month, year, transactions: dayTransactions, income: dayIncome, expense: dayExpense });
                    setShowDayModal(true);
                  }}
                  className={`aspect-square p-1.5 rounded-xl relative cursor-pointer transition-all group
                    ${isToday
                      ? 'ring-2 ring-cyan-500 bg-cyan-500/20'
                      : isWeekend
                        ? (darkMode ? 'bg-purple-500/10 hover:bg-purple-500/20' : 'bg-purple-50 hover:bg-purple-100')
                        : (darkMode ? 'bg-slate-700/30 hover:bg-slate-700/50' : 'bg-gray-50 hover:bg-gray-100')
                    }
                    ${hasTransactions ? (darkMode ? 'border border-slate-600' : 'border border-gray-200') : ''}
                  `}
                >
                  <span className={`text-sm font-medium ${
                    isToday
                      ? 'text-cyan-400 font-bold'
                      : isWeekend
                        ? (darkMode ? 'text-purple-400' : 'text-purple-600')
                        : (darkMode ? 'text-slate-300' : 'text-gray-700')
                  }`}>
                    {day}
                  </span>

                  {hasTransactions && (
                    <div className="absolute bottom-1 left-1 right-1 space-y-0.5">
                      {dayIncome > 0 && (
                        <div className="text-[9px] font-medium text-emerald-400 bg-emerald-500/20 rounded px-1 truncate">
                          +{dayIncome >= 1000 ? `${(dayIncome/1000).toFixed(1)}k` : dayIncome.toFixed(0)}
                        </div>
                      )}
                      {dayExpense > 0 && (
                        <div className="text-[9px] font-medium text-rose-400 bg-rose-500/20 rounded px-1 truncate">
                          -{dayExpense >= 1000 ? `${(dayExpense/1000).toFixed(1)}k` : dayExpense.toFixed(0)}
                        </div>
                      )}
                    </div>
                  )}

                  {dayTransactions.length > 0 && (
                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      darkMode ? 'bg-slate-600 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {dayTransactions.length}
                    </div>
                  )}
                </div>
              );
            }
            return cells;
          })()}
        </div>

        {/* Légende */}
        <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'} flex flex-wrap gap-4 text-xs`}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-cyan-500/50 ring-2 ring-cyan-500" />
            <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Aujourd'hui</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${darkMode ? 'bg-purple-500/30' : 'bg-purple-100'}`} />
            <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Weekend</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500/30" />
            <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Revenu</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-rose-500/30" />
            <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Dépense</span>
          </div>
        </div>
      </div>

      {/* Liste des transactions du mois */}
      <div className={`p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'} border backdrop-blur-sm`}>
        <h4 className={`font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <span>📋</span>
          Transactions de {MONTHS_FR[selectedDate.getMonth()]}
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>
            {getMonthlyData.transactions.length}
          </span>
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {getMonthlyData.transactions.length === 0 ? (
            <p className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              📭 Aucune transaction ce mois
            </p>
          ) : (
            getMonthlyData.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => {
              const category = getCategoryInfo(t.category);
              return (
                <div key={t.id} className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'} transition-all group`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      t.type === 'income'
                        ? (darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100')
                        : (darkMode ? 'bg-rose-500/20' : 'bg-rose-100')
                    }`}>
                      {category.icon}
                    </div>
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t.name}</p>
                      <div className="flex items-center gap-2">
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{formatDate(t.date)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                          {category.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-lg ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                    <button
                      onClick={() => onDeleteTransaction(t.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal jour */}
      {showDayModal && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowDayModal(false)}>
          <div className={`w-full max-w-md ${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {selectedDay.day} {MONTHS_FR[selectedDay.month]} {selectedDay.year}
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                  <p className={`text-xs ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Revenus</p>
                  <p className="text-lg font-bold text-emerald-400">+{formatCurrency(selectedDay.income)}</p>
                </div>
                <div className={`p-3 rounded-xl ${darkMode ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
                  <p className={`text-xs ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>Dépenses</p>
                  <p className="text-lg font-bold text-rose-400">-{formatCurrency(selectedDay.expense)}</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedDay.transactions.length === 0 ? (
                  <p className={`text-center py-4 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Aucune transaction</p>
                ) : (
                  selectedDay.transactions.map(t => {
                    const category = getCategoryInfo(t.category);
                    return (
                      <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          <span className={darkMode ? 'text-white' : 'text-gray-900'}>{t.name}</span>
                        </div>
                        <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowDayModal(false)}
                className={`w-full py-3 rounded-xl font-medium ${darkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;