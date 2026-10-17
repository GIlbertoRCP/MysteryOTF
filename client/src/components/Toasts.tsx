import React from 'react';
import { Role } from '../types';
import { ROLE_COLORS } from '../cardInfo';

export interface Toast {
  id: string;
  text: string;
  role?: Role;
}

export const Toasts: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="pointer-events-none fixed top-[68px] right-4 z-50 flex flex-col items-end gap-2" aria-live="polite">
    {toasts.map(toast => (
      <div key={toast.id} className="toast-in flex items-center gap-2.5 rounded-lg panel px-3.5 py-2.5 shadow-2xl max-w-[360px] text-[13.5px] text-[var(--text)]">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: toast.role ? ROLE_COLORS[toast.role] : 'var(--brass)' }} />
        {toast.text}
      </div>
    ))}
  </div>
);
