"use client";
import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";

interface ShuttleStopLocationPickerModalProps {
    open: boolean;
    onClose: () => void;
    value?: { x: number; y: number } | null;
    onSelect: (v: { x: number; y: number }, label?: string) => void;
}

/**
 * Modal wrapper around existing LocationPicker for shuttle stop coordinate selection.
 */
const ShuttleStopLocationPickerModal: React.FC<
    ShuttleStopLocationPickerModalProps
> = ({ open, onClose, value, onSelect }) => {
    const LocationPicker = useMemo(
        () =>
            dynamic(() => import("@/components/common/LocationPicker"), {
                ssr: false,
            }),
        []
    );
    const [temp, setTemp] = useState<
        { x: number; y: number } | null | undefined
    >(value);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[1700] bg-black/40 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="font-semibold mb-2 text-sm">셔틀 좌표 선택</h3>
                <LocationPicker
                    value={temp || undefined}
                    onSelect={(coords) => setTemp(coords)}
                    height={360}
                />
                <div className="mt-3 text-xs text-gray-600">
                    지도 클릭으로 경도/위도를 선택하세요. 저장 시 해당 좌표가
                    적용됩니다.
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button
                        className="px-3 py-2 text-sm rounded border"
                        onClick={onClose}
                    >
                        취소
                    </button>
                    <button
                        className="px-3 py-2 text-sm rounded bg-blue-600 text-white disabled:bg-blue-300"
                        disabled={!temp}
                        onClick={() => {
                            if (temp) {
                                onSelect(temp);
                                onClose();
                            }
                        }}
                    >
                        적용
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShuttleStopLocationPickerModal;
