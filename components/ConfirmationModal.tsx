
import React from 'react';
import Button from './Button';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmer",
  cancelText,
  variant = 'danger',
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" onClick={loading ? undefined : onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              {message}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              {cancelText && <Button onClick={onClose} variant="secondary" disabled={loading}>{cancelText}</Button>}
              <Button onClick={onConfirm} variant={variant} loading={loading}>{confirmText}</Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
