// src/components/modals/ConfirmationModal.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({ message, onConfirm, onCancel, isOpen }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-700 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Confirm Action</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-slate-300 text-base mb-6 leading-relaxed pl-15">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-all duration-200 border border-slate-600 hover:border-slate-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-all duration-200 shadow-lg shadow-red-900/20 hover:shadow-red-900/40 border border-red-500/50 hover:border-red-400"
          >
            Confirm
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
};

export default ConfirmationModal;
