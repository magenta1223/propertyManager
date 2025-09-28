"use client";
import React, { useEffect, useRef, useState } from "react";

/**
 * Minimal LocationPicker (Naver Maps)
 * - Loads Naver Maps script (no geocoder submodule)
 * - Click map to select / move marker
 * - Emits coords via onSelect({ x: lng, y: lat })
 * - Retains (coords, label?) signature but doesn't auto-resolve label
 */
interface LocationPickerProps {
    value?: { x: number; y: number } | null;
    onSelect: (coords: { x: number; y: number }, label?: string) => void;
    height?: number;
    className?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
    value,
    onSelect,
    height = 320,
    className = "",
}) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const markerRef = useRef<any>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load script
    useEffect(() => {
        if (typeof window === "undefined") return;
        if ((window as any).naver?.maps) {
            setScriptLoaded(true);
            return;
        }
        const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
        if (!clientId) {
            setError("환경변수(NAVER MAP ID)가 설정되지 않았습니다.");
            return;
        }
        const existing = document.querySelector(
            'script[data-naver-maps="true"]'
        );
        if (existing) {
            const check = setInterval(() => {
                if ((window as any).naver?.maps) {
                    clearInterval(check);
                    setScriptLoaded(true);
                }
            }, 150);
            return () => clearInterval(check);
        }
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
        script.setAttribute("data-naver-maps", "true");
        script.onload = () => setScriptLoaded(true);
        script.onerror = () => setError("네이버 지도 스크립트 로드 실패");
        document.head.appendChild(script);
    }, []);

    // Initialize map
    useEffect(() => {
        if (!scriptLoaded || !mapRef.current) return;
        const naver = (window as any).naver;
        if (!naver?.maps) return;
        const center = value
            ? new naver.maps.LatLng(value.y, value.x)
            : new naver.maps.LatLng(37.5665, 126.978); // Seoul
        const map = new naver.maps.Map(mapRef.current, { center, zoom: 13 });
        if (value) {
            markerRef.current = new naver.maps.Marker({
                position: center,
                map,
            });
        }
        naver.maps.Event.addListener(map, "click", (e: any) => {
            const { _lng, _lat } = e.coord;
            if (!markerRef.current) {
                markerRef.current = new naver.maps.Marker({
                    position: e.coord,
                    map,
                });
            } else {
                markerRef.current.setPosition(e.coord);
            }
            onSelect({ x: _lng, y: _lat });
        });
    }, [scriptLoaded, value, onSelect]);

    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            {error && <p className="text-xs text-red-500">{error}</p>}
            {!error && !scriptLoaded && (
                <p className="text-xs text-gray-400">지도 스크립트 로딩중...</p>
            )}
            <div
                ref={mapRef}
                style={{ height }}
                className="w-full rounded border bg-gray-50"
            />
            <p className="text-xs text-gray-500">
                지도 클릭으로 좌표(x:경도, y:위도)를 선택합니다.
            </p>
            {value && (
                <div className="text-xs text-gray-700">
                    선택됨: x={value.x}, y={value.y}
                </div>
            )}
        </div>
    );
};

export default LocationPicker;
