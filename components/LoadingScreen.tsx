import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-4 bg-white dark:bg-slate-800 rounded-full shadow-inner flex items-center justify-center">
            <span className="text-2xl">⚖️</span>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">
        Reviewing the Play
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-md animate-pulse">
        The Referee is analyzing your constraints and comparing options against millions of data points...
      </p>
    </div>
  );
};