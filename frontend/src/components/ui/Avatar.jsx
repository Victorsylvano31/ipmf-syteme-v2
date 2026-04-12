import React from 'react';

const Avatar = ({ src, name, size = 'md', className = '' }) => {
    const sizeClasses = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        base: 'w-10 h-10 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-20 h-20 text-xl',
        xl: 'w-32 h-32 text-3xl',
        '2xl': 'w-48 h-48 text-5xl',
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <div
            className={`
                relative flex-shrink-0 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-sm
                flex items-center justify-center font-bold text-slate-500
                ${sizeClasses[size] || sizeClasses.md}
                ${className}
            `}
        >
            {src ? (
                <img
                    src={src}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = ''; // Force fallback if image fails to load
                    }}
                />
            ) : (
                <span className="select-none">{getInitials(name)}</span>
            )}
        </div>
    );
};

export default Avatar;
