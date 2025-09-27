import React, { useEffect, useCallback } from "react";

interface ModalProps {
    open: boolean;
    title?: string;
    subtitle?: string;
    children?: React.ReactNode; // content body
    onDismiss?: () => void; // backdrop click or ESC
    onCancel?: () => void; // cancel button
    onSave?: () => void; // primary action
    cancelText?: string;
    saveText?: string;
    saveDisabled?: boolean;
    className?: string; // extra panel classes
    actionsClassName?: string; // extra actions classes
    showClose?: boolean; // show top-right X
    hideActions?: boolean; // hide footer buttons
}

const Modal: React.FC<ModalProps> = ({
    open,
    title,
    subtitle,
    children,
    onDismiss,
    onCancel,
    onSave,
    cancelText = "Cancel",
    saveText = "Save",
    saveDisabled,
    className = "",
    actionsClassName = "",
    showClose = true,
    hideActions = false,
}) => {
    const handleDismiss = useCallback(() => {
        if (onDismiss) onDismiss();
        else if (onCancel) onCancel();
    }, [onDismiss, onCancel]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleDismiss();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, handleDismiss]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center"
            aria-modal="true"
            role="dialog"
            onClick={handleDismiss}
        >
            <div className="absolute inset-0 bg-black/30" />
            <div
                className={`relative bg-white w-full max-w-md mx-4 rounded-lg shadow-2xl p-6 animate-scale-in ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {(title || showClose) && (
                    <div className="flex items-start justify-between mb-4">
                        <div className="pr-4">
                            {title && (
                                <h3 className="text-lg font-bold leading-tight">
                                    {title}
                                </h3>
                            )}
                            {subtitle && (
                                <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {showClose && (
                            <button
                                type="button"
                                onClick={handleDismiss}
                                aria-label="Close"
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}

                <div className="modal-body text-sm leading-relaxed">
                    {children}
                </div>

                {!hideActions && (
                    <div
                        className={`flex justify-end gap-3 mt-6 ${actionsClassName}`}
                    >
                        <button
                            type="button"
                            onClick={onCancel || handleDismiss}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {cancelText}
                        </button>
                        {onSave && (
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={saveDisabled}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {saveText}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
