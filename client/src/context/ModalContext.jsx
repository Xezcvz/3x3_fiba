import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, CheckCircle2, Info, X } from 'lucide-react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modalConfig, setModalConfig] = useState(null);

  /**
   * Show a beautiful confirmation modal
   * @param {Object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} [options.confirmText='ยืนยัน']
   * @param {string} [options.cancelText='ยกเลิก']
   * @param {'danger'|'warning'|'info'} [options.type='danger']
   * @returns {Promise<boolean>}
   */
  const confirm = useCallback(({
    title = 'ยืนยันการทำรายการ',
    message = 'คุณแน่ใจหรือไม่ว่าต้องการดำเนินการนี้?',
    confirmText = 'ยืนยันการลบ',
    cancelText = 'ยกเลิก',
    type = 'danger',
  }) => {
    return new Promise((resolve) => {
      setModalConfig({
        isAlert: false,
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          setModalConfig(null);
          resolve(true);
        },
        onCancel: () => {
          setModalConfig(null);
          resolve(false);
        },
      });
    });
  }, []);

  /**
   * Show a beautiful alert modal (replacing window.alert)
   * @param {Object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {'error'|'success'|'info'} [options.type='info']
   * @param {string} [options.buttonText='ตกลง']
   * @returns {Promise<void>}
   */
  const alert = useCallback(({
    title = 'แจ้งเตือน',
    message = '',
    type = 'info',
    buttonText = 'ตกลง',
  }) => {
    return new Promise((resolve) => {
      setModalConfig({
        isAlert: true,
        title,
        message,
        buttonText,
        type,
        onConfirm: () => {
          setModalConfig(null);
          resolve();
        },
        onCancel: () => {
          setModalConfig(null);
          resolve();
        },
      });
    });
  }, []);

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}

      {/* Modern Custom UI Modal */}
      {modalConfig && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 transform transition-all animate-scaleUp relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              onClick={modalConfig.onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon + Header */}
            <div className="flex items-start gap-4 mb-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                  modalConfig.type === 'danger' || modalConfig.type === 'error'
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : modalConfig.type === 'warning'
                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                    : modalConfig.type === 'success'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-primary-50 text-primary-600 border border-primary-100'
                }`}
              >
                {modalConfig.type === 'danger' ? (
                  <Trash2 className="w-6 h-6 animate-pulse" />
                ) : modalConfig.type === 'warning' || modalConfig.type === 'error' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : modalConfig.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>

              <div className="pt-0.5">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                  {modalConfig.title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {modalConfig.message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              {!modalConfig.isAlert && (
                <button
                  type="button"
                  onClick={modalConfig.onCancel}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {modalConfig.cancelText || 'ยกเลิก'}
                </button>
              )}

              <button
                type="button"
                onClick={modalConfig.onConfirm}
                autoFocus
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all ${
                  modalConfig.type === 'danger' || modalConfig.type === 'error'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
                    : modalConfig.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25'
                    : modalConfig.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
                    : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/25'
                }`}
              >
                {modalConfig.isAlert
                  ? modalConfig.buttonText || 'ตกลง'
                  : modalConfig.confirmText || 'ยืนยัน'}
              </button>
            </div>

          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
