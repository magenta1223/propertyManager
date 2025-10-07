import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Field } from "@/models/types";
import { loadNaverMaps } from "@/lib/loadNaverMaps";

interface LocationPickerModalProps {
    open: boolean;
    field: Field | null;
    editingValue: any; // {x,y} or undefined
    editingLabel: string;
    onChangeValue: (v: any) => void;
    onChangeLabel: (s: string) => void;
    onApply: () => void;
    onCancel: () => void;
    onSearchAddress?: (keyword: string) => Promise<
        | {
              x: number;
              y: number;
              label?: string;
          }
        | null
        | undefined
    >; // optional async search hook supplied by parent
}

/**
 * LocationPickerModal
 *  - Lazy load LocationPicker (client only)
 *  - Provides UI for selecting coordinates + label
 */
const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
    open,
    field,
    editingValue,
    editingLabel,
    onChangeValue,
    onChangeLabel,
    onApply,
    onCancel,
    onSearchAddress,
}) => {
    const LocationPicker = useMemo(
        () =>
            dynamic(() => import("@/components/common/LocationPicker"), {
                ssr: false,
            }),
        []
    );

    const [searchTerm, setSearchTerm] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [resolvedAddresses, setResolvedAddresses] = useState<string[]>([]);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setSearching(true);
        setSearchError(null);
        setResolvedAddresses([]);

        try {
            // 1. 외부 검색 훅 우선 (제공된 경우)
            if (onSearchAddress) {
                const ext = await onSearchAddress(searchTerm.trim());
                if (ext) {
                    onChangeValue({ x: ext.x, y: ext.y });
                    if (ext.label) onChangeLabel(ext.label);
                    if (ext.label) setResolvedAddresses([ext.label]);
                    return;
                }
            }

            // 2. 내부 geocoder (lazy load 보장)
            await loadNaverMaps({ submodules: ["geocoder"] });
            const w: any = window as any;
            const naverObj = w.naver;
            if (!naverObj?.maps?.Service) {
                setSearchError("지오코딩 모듈을 사용할 수 없습니다.");
                return;
            }
            await new Promise<void>((resolve) => {
                naverObj.maps.Service.geocode(
                    { query: searchTerm.trim() },
                    (status: any, response: any) => {
                        if (status === naverObj.maps.Service.Status.ERROR) {
                            setSearchError("주소를 찾을 수 없습니다.");
                            return resolve();
                        }
                        if (response.v2.meta.totalCount === 0) {
                            setSearchError(
                                "주소를 찾을 수 없습니다: 0 results"
                            );
                            return resolve();
                        }
                        const item = response.v2.addresses[0];
                        const lat = parseFloat(item.y);
                        const lng = parseFloat(item.x);
                        onChangeValue({ x: lng, y: lat });
                        const collected: string[] = [];
                        if (item.roadAddress)
                            collected.push(`[도로명] ${item.roadAddress}`);
                        if (item.jibunAddress)
                            collected.push(`[지번] ${item.jibunAddress}`);
                        setResolvedAddresses(collected);
                        onChangeLabel(
                            item.roadAddress ||
                                item.jibunAddress ||
                                searchTerm.trim()
                        );
                        resolve();
                    }
                );
            });
        } catch (e: any) {
            setSearchError(e.message || "검색 실패");
        } finally {
            setSearching(false);
        }
    };

    if (!open || !field) return null;

    return (
        <div
            className="fixed inset-0 z-[1500] bg-black/40 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="font-semibold mb-2 text-sm">
                    위치 선택 (필드: {field.name})
                </h3>
                <LocationPicker
                    value={
                        editingValue && typeof editingValue === "object"
                            ? {
                                  x: parseFloat(editingValue.x) || 0,
                                  y: parseFloat(editingValue.y) || 0,
                              }
                            : undefined
                    }
                    onSelect={(coords, lbl) => {
                        onChangeValue(coords);
                        if (lbl) onChangeLabel(lbl);
                    }}
                    height={360}
                />
                <div className="mt-3 flex gap-2 items-start">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border rounded text-sm"
                            placeholder="주소 / 키워드 검색"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSearch();
                                }
                            }}
                        />
                        {searchError && (
                            <p className="mt-1 text-xs text-red-500">
                                {searchError}
                            </p>
                        )}
                        {resolvedAddresses.length > 0 && (
                            <ul className="mt-1 space-y-1 text-[11px] text-gray-600">
                                {resolvedAddresses.map((addr, idx) => (
                                    <li key={idx}>• {addr}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={searching || !searchTerm.trim()}
                        className="px-3 py-2 text-sm rounded bg-indigo-600 text-white disabled:bg-indigo-300"
                    >
                        {searching ? "검색중..." : "검색"}
                    </button>
                </div>
                <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        주소 / 레이블
                    </label>
                    <input
                        type="text"
                        value={editingLabel}
                        onChange={(e) => onChangeLabel(e.target.value)}
                        className="w-full px-3 py-2 border rounded text-sm"
                        placeholder="예) 서울특별시 중구 ..."
                    />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <button
                        className="px-4 py-2 text-sm rounded border"
                        onClick={onCancel}
                    >
                        취소
                    </button>
                    <button
                        className="px-4 py-2 text-sm rounded bg-blue-600 text-white"
                        onClick={onApply}
                    >
                        적용
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationPickerModal;
