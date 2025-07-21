import React from 'react';
import ThreeMasLogo from './ThreeMasLogo';
import LoadingSpinner from './LoadingSpinner';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100">
      <ThreeMasLogo className="w-64 h-24 sm:w-96 sm:h-36 md:w-[400px] md:h-[120px] lg:w-[520px] lg:h-[220px]" />
      <div className="mt-8">
        <LoadingSpinner size="lg" />
      </div>
      <div className="mt-6 text-2xl font-bold text-purple-700 tracking-wide drop-shadow-lg">
        IT Support
      </div>
    </div>
  );
} 