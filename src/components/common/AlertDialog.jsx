import React from 'react';
import { useApp } from '../../context/AppContext';

const AlertDialog = () => {
  const { alertDialog, setAlertDialog, darkMode } = useApp();

  if (!alertDialog.show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl overflow-hidden`}>
        <div className="p-6 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl ${
            alertDialog.type === 'success' ? (darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100') :
            alertDialog.type === 'error' ? (darkMode ? 'bg-rose-500/20' : 'bg-rose-100') :
            (darkMode ? 'bg-amber-500/20' : 'bg-amber-100')
          }`}>
            {alertDialog.type === 'success' ? '✅' : alertDialog.type === 'error' ? '❌' : '⚠️'}
          </div>
          <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {alertDialog.title}
          </h3>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            {alertDialog.message}
          </p>
        </div>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={() => setAlertDialog({ show: false, title: '', message: '', type: 'success' })}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${
              alertDialog.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' :
              alertDialog.type === 'error' ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
              'bg-gradient-to-r from-amber-500 to-orange-500'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;