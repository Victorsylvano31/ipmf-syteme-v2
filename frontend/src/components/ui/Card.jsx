import React from 'react';

export function Card({ children, className = '', ...props }) {
    return (
        <div
            className={`bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '', ...props }) {
    return (
        <div className={`p-5 border-b border-[var(--color-border-light)] ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className = '', ...props }) {
    return (
        <h3 className={`text-lg font-semibold text-[var(--color-text-primary)] ${className}`} {...props}>
            {children}
        </h3>
    );
}

export function CardDescription({ children, className = '', ...props }) {
    return (
        <p className={`text-sm text-[var(--color-text-secondary)] mt-1 ${className}`} {...props}>
            {children}
        </p>
    );
}

export function CardContent({ children, className = '', ...props }) {
    return (
        <div className={`p-5 ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className = '', ...props }) {
    return (
        <div className={`p-4 bg-[var(--color-bg-hover)] border-t border-[var(--color-border-light)] ${className}`} {...props}>
            {children}
        </div>
    );
}
