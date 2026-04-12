import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`
                relative flex items-center justify-center w-10 h-10 
                rounded-xl transition-all duration-300
                ${theme === 'dark'
                    ? 'bg-slate-800 text-yellow-400 border border-slate-700'
                    : 'bg-white text-slate-600 border border-slate-200 shadow-sm'}
                hover:scale-110 active:scale-95
            `}
            aria-label={`Passer au mode ${theme === 'light' ? 'sombre' : 'clair'}`}
            title={`Passer au mode ${theme === 'light' ? 'sombre' : 'clair'}`}
        >
            <div className="relative w-6 h-6 flex items-center justify-center">
                {theme === 'light' ? (
                    <Sun className="w-5 h-5 transition-all duration-500 rotate-0 scale-100" />
                ) : (
                    <Moon className="w-5 h-5 transition-all duration-500 rotate-[360deg] scale-100" />
                )}
            </div>

            {/* Subtle glow effect */}
            <div className={`
                absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300
                ${theme === 'dark' ? 'shadow-[0_0_15px_rgba(250,204,21,0.2)]' : 'shadow-[0_0_15px_rgba(59,130,246,0.1)]'}
            `} />
        </button>
    );
}
