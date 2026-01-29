import React from 'react';
import { useApp } from '../../context/AppContext';

const ConfirmDialog = () => {
  const { confirmDialog, setConfirmDialog, darkMode } = useApp();

  if (!confirmDialog.show) return null;

  const handleConfirm = () => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm();
    }
  };

  const handleCancel = () => {
    setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-sm ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl overflow-hidden`}>
        <div className="p-6 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl ${darkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
            ⚠️
          </div>
          <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {confirmDialog.title}
          </h3>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>
            {confirmDialog.message}
          </p>
        </div>
        <div className={`p-4 border-t ${darkMode ? 'border-slate-700' : 'border-gray-200'} flex gap-3`}>
          <button
            onClick={handleCancel}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 transition-all"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;