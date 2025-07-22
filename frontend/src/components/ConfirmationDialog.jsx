import { useState, useEffect } from 'react';
import { AlertTriangle, X, Check, XCircle } from 'lucide-react';

const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to perform this action?', 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info'
  loading = false 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: XCircle,
          iconColor: 'text-red-500',
          buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          borderColor: 'border-red-200 dark:border-red-700'
        };
      case 'info':
        return {
          icon: AlertTriangle,
          iconColor: 'text-blue-500',
          buttonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          borderColor: 'border-blue-200 dark:border-blue-700'
        };
      default:
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-500',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          borderColor: 'border-yellow-200 dark:border-yellow-700'
        };
    }
  };

  const typeStyles = getTypeStyles();
  const IconComponent = typeStyles.icon;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-all duration-300 ease-in-out animate-fadeIn">
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 transform transition-all duration-300 ease-in-out scale-95 sm:scale-100 animate-modalIn border ${typeStyles.borderColor}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-800`}>
              <IconComponent className={`w-6 h-6 ${typeStyles.iconColor}`} aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          {!loading && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={loading}
            className="btn-secondary flex-1 sm:flex-none order-2 sm:order-1"
            aria-label="Cancel action"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`btn text-white ${typeStyles.buttonColor} flex-1 sm:flex-none order-1 sm:order-2 flex items-center justify-center gap-2`}
            aria-label="Confirm action"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog; 