import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

// ============================================
// QUICK ADD FLOATING BUTTON
// ============================================

interface QuickAddButtonProps {
  actions: QuickAction[];
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export const QuickAddButton: React.FC<QuickAddButtonProps> = ({
  actions,
  position = 'bottom-right',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Tip 2: Keyboard Shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6 lg:bottom-6 lg:right-6',
    'bottom-left': 'bottom-6 left-6 lg:bottom-6 lg:left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-40 pb-safe`}>
      {/* Action Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[-1]" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-20 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 dark:border-slate-700 p-2 min-w-[240px] animate-in slide-in-from-bottom-2 duration-300">
            {actions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => {
                  // Tip 1: Track Most Used Actions
                  console.log('Quick action used:', action.id);
                  // In a real app, you would send this to an analytics service.
                  action.onClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all group animate-in slide-in-from-bottom-4 fade-in duration-300"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                <div className={`p-2 rounded-lg ${action.color}`}>
                  {action.icon}
                </div>
                <span className="font-medium text-slate-900 dark:text-slate-100 group-hover:translate-x-1 transition-transform">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative w-16 h-16 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-110 ${
          isOpen ? 'rotate-45' : ''
        }`}
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
        aria-expanded={isOpen}
      >
        <Plus className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300" />
        
        {!isOpen && <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 animate-ping opacity-30" />}
        
        {!isOpen && (
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/80 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none backdrop-blur-sm">
            Quick Actions
          </span>
        )}
      </button>
    </div>
  );
};
