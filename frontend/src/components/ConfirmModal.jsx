import { AlertTriangle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { useRef, useEffect } from 'react';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to perform this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  variant = 'danger' // 'danger', 'warning', 'info'
}) => {
  const confirmButtonRef = useRef(null);
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'btn-danger';
      case 'warning':
        return 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 btn';
      case 'info':
        return 'btn-primary';
      default:
        return 'btn-danger';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'danger':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-red-600';
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40 dark:bg-opacity-60 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 w-full max-w-md transition-colors duration-300">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="mb-6 text-gray-700 dark:text-gray-300">{message}</p>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary dark:bg-gray-700 dark:text-gray-200" onClick={onClose} disabled={isLoading}>{cancelText}</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full inline-flex justify-center items-center ${getButtonClass()} sm:ml-3 sm:w-auto sm:text-sm`}
            ref={confirmButtonRef}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
