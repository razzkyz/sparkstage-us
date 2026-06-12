interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: 'warning' | 'danger' | 'info';
  isDangerous?: boolean; // Backward compatibility
  isLoading?: boolean; // Backward compatibility
}

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
  onConfirm,
  onCancel,
  icon = 'warning',
  isDangerous: _isDangerous, // Ignored, for backward compatibility
  isLoading: _isLoading, // Ignored, for backward compatibility
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  const iconConfig = {
    warning: {
      class: 'text-yellow-600',
      name: 'warning',
    },
    danger: {
      class: 'text-red-600',
      name: 'delete',
    },
    info: {
      class: 'text-blue-600',
      name: 'info',
    },
  };

  const currentIcon = iconConfig[icon];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`rounded-full p-3 ${icon === 'danger' ? 'bg-red-100' : icon === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
              <span className={`material-symbols-outlined text-4xl ${currentIcon.class}`}>
                {currentIcon.name}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-center text-xl font-bold text-gray-900 mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-center text-sm text-gray-600 whitespace-pre-line mb-6">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${confirmButtonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
