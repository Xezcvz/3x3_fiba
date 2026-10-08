import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ApiErrorNotice({ onRetry, message = 'โหลดข้อมูลไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองอีกครั้ง' }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-800 transition hover:bg-rose-100 sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          ลองอีกครั้ง
        </button>
      )}
    </div>
  );
}
