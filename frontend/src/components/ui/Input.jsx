import React from 'react';

export default function Input({
    label,
    error,
    className = '',
    icon: Icon,
    ...props
}) {
    return (
        <div className="space-y-1 w-full">
            {label && (
                <label className="text-sm font-medium text-[var(--color-text-secondary)] ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-blue-500 transition-colors">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    className={`
            w-full py-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl 
            focus:ring-4 focus:ring-blue-100/20 focus:border-blue-500 
            outline-none transition-all text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
            ${Icon ? 'pl-11 pr-4' : 'px-4'}
            ${error ? 'border-red-500 focus:ring-red-100' : ''}
            ${className}
          `}
                    {...props}
                />
            </div>
            {error && (
                <p className="text-xs text-red-600 ml-1">{error}</p>
            )}
        </div>
    );
}
