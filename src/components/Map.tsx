"use client";

import React, { useEffect, useRef, useState } from "react";

// TypeScript에서 window.naver 객체를 인식하도록 설정
declare global {
    interface Window {
        naver: any;
    }
}

export default function Map() {
    const mapElement = useRef<HTMLDivElement>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState(false);

    // 1. Naver Maps API 스크립트를 동적으로 로드하는 useEffect
    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

        if (!clientId) {
            console.error("Naver Map Client ID가 설정되지 않았습니다.");
            setMapError(true);
            return;
        }

        // 이미 스크립트가 로드되었는지 확인
        if (window.naver && window.naver.maps) {
            setMapLoaded(true);
            return;
        }

        const script = document.createElement("script");
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
        script.async = true;
        script.onload = () => {
            console.log("Naver Maps script loaded successfully.");
            setMapLoaded(true);
        };
        script.onerror = (error) => {
            console.error("Failed to load Naver Maps script:", error);
            setMapError(true);
        };

        document.head.appendChild(script);

        return () => {
            // 컴포넌트가 언마운트될 때 스크립트 태그를 정리할 수 있지만,
            // 일반적으로 지도 API 스크립트는 페이지 전체에서 한 번만 로드하므로 필수는 아님
        };
    }, []);

    // 2. 스크립트가 로드된 후 지도를 초기화하는 useEffect
    useEffect(() => {
        // 스크립트가 로드되지 않았거나, div 엘리먼트가 없거나, 에러가 발생했다면 실행하지 않음
        if (!mapLoaded || !mapElement.current || mapError) {
            return;
        }

        try {
            // 지도의 기본 위치를 서울 시청으로 설정
            const location = new window.naver.maps.LatLng(37.5665, 126.978);

            const mapOptions = {
                center: location,
                zoom: 15,
                zoomControl: true,
            };

            // 지도 생성
            const map = new window.naver.maps.Map(
                mapElement.current,
                mapOptions
            );

            // 간단한 마커 생성
            new window.naver.maps.Marker({
                position: location,
                map: map,
            });
        } catch (error) {
            console.error("Failed to initialize Naver Map:", error);
            setMapError(true);
        }
    }, [mapLoaded, mapError]); // mapLoaded나 mapError 상태가 변경될 때 이 효과를 다시 실행

    return (
        <div ref={mapElement} style={{ width: "100%", height: "100%" }}>
            {mapError && (
                <div>
                    지도 인증에 실패했거나 로딩 중 오류가 발생했습니다. Client
                    ID와 네트워크 연결을 확인해주세요.
                </div>
            )}
            {!mapLoaded && !mapError && <div>지도를 불러오는 중...</div>}
        </div>
    );
}
