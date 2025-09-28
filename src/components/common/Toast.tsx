import React, { useEffect } from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastProps {
    id: string;
    message: string;
    variant?: ToastVariant;
    duration?: number; // ms; if undefined => persistent
    onClose?: (id: string) => void;
    actionLabel?: string;
    onAction?: () => void;
}

const variantStyles: Record<ToastVariant, string> = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-amber-500",
};

const icons: Record<ToastVariant, string> = {
    success: "✅",
    error: "⚠️",
    info: "ℹ️",
    warning: "⚠️",
};

export const Toast: React.FC<ToastProps> = ({
    id,
    message,
    variant = "info",
    duration = 3000,
    onClose,
    actionLabel,
    onAction,
}) => {
    useEffect(() => {
        if (!duration) return;
        const t = setTimeout(() => {
            onClose?.(id);
        }, duration);
        return () => clearTimeout(t);
    }, [id, duration, onClose]);

    return (
        <div
            className={`pointer-events-auto ${variantStyles[variant]} text-white px-4 py-3 rounded shadow-lg flex items-start gap-3 w-full min-w-[260px] animate-fade-in`}
        >
            <span className="text-lg leading-none">{icons[variant]}</span>
            <div className="text-sm font-medium leading-snug whitespace-pre-line flex-1">
                {message}
                {actionLabel && (
                    <button
                        onClick={onAction}
                        className="ml-2 underline font-normal text-white/90 hover:text-white"
                    >
                        {actionLabel}
                    </button>
                )}
            </div>
            <button
                onClick={() => onClose?.(id)}
                className="ml-2 text-white/80 hover:text-white"
                aria-label="Close toast"
            >
                ✕
            </button>
        </div>
    );
};

export interface ToastContainerProps {
    toasts: Omit<ToastProps, "onClose">[];
    onClose: (id: string) => void;
    position?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
    toasts,
    onClose,
    position = "bottom-right",
}) => {
    const posClass = {
        "bottom-right": "bottom-6 right-6",
        "top-right": "top-6 right-6",
        "bottom-left": "bottom-6 left-6",
        "top-left": "top-6 left-6",
    }[position];

    return (
        <div className={`fixed z-[1400] flex flex-col gap-3 ${posClass}`}>
            {toasts.map((t) => (
                <Toast key={t.id} {...t} onClose={onClose} />
            ))}
        </div>
    );
};

export default Toast;
