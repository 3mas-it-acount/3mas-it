import LoadingSpinner from './LoadingSpinner';

const LoadingOverlay = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
    <div className="flex flex-col items-center space-y-4">
      <LoadingSpinner size="lg" />
      <span className="text-gray-700 dark:text-gray-200 text-lg font-medium">{message}</span>
    </div>
  </div>
);

export default LoadingOverlay; 