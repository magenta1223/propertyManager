"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Property, PropertyField } from "@/models/types";

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
    const [properties, setProperties] = useState<Property[]>([]);
    const [loadingProps, setLoadingProps] = useState(false);
    const markersRef = useRef<any[]>([]); // keep track of created markers for cleanup
    const openInfoRef = useRef<any | null>(null); // 현재 열린 InfoWindow 추적

    // Field name -> category mapping (확장 가능)
    const classifyField = (name: string): "primary" | "shuttle" | "other" => {
        if (name === "Location") return "primary"; // 대표 위치
        if (name.includes("셔틀") || name.includes("승차장")) return "shuttle"; // 셔틀/정류장 등
        return "other";
    };

    const markerStyleFor = (category: string) => {
        // Return HTML content + anchor settings
        switch (category) {
            case "primary":
                return {
                    content:
                        '<div style="transform:translate(-50%,-50%);width:22px;height:22px;background:#2563eb;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
                    anchor: new window.naver.maps.Point(11, 11),
                };
            case "shuttle":
                return {
                    content:
                        '<div style="transform:translate(-50%,-50%);width:18px;height:18px;background:#10b981;border:2px solid #fff;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>',
                    anchor: new window.naver.maps.Point(9, 9),
                };
            default:
                return {
                    content:
                        '<div style="transform:translate(-50%,-50%);width:14px;height:14px;background:#6b7280;border:2px solid #fff;border-radius:50%;opacity:0.85;box-shadow:0 1px 3px rgba(0,0,0,0.25);"></div>',
                    anchor: new window.naver.maps.Point(7, 7),
                };
        }
    };

    // 1. Naver Maps API 스크립트를 동적으로 로드하는 useEffect
    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

        if (!clientId) {
            console.error("Naver Map Client ID가 설정되지 않았습니다.");
            setMapError(true);
            return;
        }

        if (window.naver && window.naver.maps) {
            setMapLoaded(true);
            return;
        }

        const script = document.createElement("script");
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
        script.async = true;
        script.onload = () => {
            setMapLoaded(true);
        };
        script.onerror = (error) => {
            console.error("Failed to load Naver Maps script:", error);
            setMapError(true);
        };

        document.head.appendChild(script);
    }, []);

    // Fetch properties once (could be optimized / moved upward later if needed)
    useEffect(() => {
        setLoadingProps(true);
        fetch("/api/properties")
            .then((r) => r.json())
            .then((data: Property[]) => setProperties(data))
            .catch((e) => console.error("Failed to load properties", e))
            .finally(() => setLoadingProps(false));
    }, []);

    // 2. 스크립트가 로드된 후 지도를 초기화하는 useEffect
    useEffect(() => {
        if (!mapLoaded || !mapElement.current || mapError) return;

        let map: any;
        try {
            const defaultCenter = new window.naver.maps.LatLng(
                37.5665,
                126.978
            );
            map = new window.naver.maps.Map(mapElement.current, {
                center: defaultCenter,
                zoom: 14,
                zoomControl: true,
            });
        } catch (e) {
            console.error("Failed to initialize Naver Map:", e);
            setMapError(true);
            return;
        }

        // Save map instance on ref for potential future usage (not needed yet)
        (mapElement.current as any)._naverMapInstance = map;

        return () => {
            // Cleanup markers if any (safety)
            markersRef.current.forEach((m) => m.setMap(null));
            markersRef.current = [];
        };
    }, [mapLoaded, mapError]);

    // Add / update markers whenever properties change or map becomes available
    useEffect(() => {
        if (!mapLoaded || mapError || !mapElement.current) return;
        const map: any = (mapElement.current as any)._naverMapInstance;
        if (!map) return;

        // Clear existing markers
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        interface ParsedLocation {
            lat: number; // actually latitude (y)
            lng: number; // longitude (x)
            label?: string;
            propertyId: number;
            fieldName: string;
        }

        const parsed: ParsedLocation[] = [];
        properties.forEach((p) => {
            p.fields
                .filter((f: PropertyField) => f.type === "location" && f.value)
                .forEach((f) => {
                    // stored format: "lng,lat" (observed in JSON as 127.x,37.x)
                    const parts = String(f.value)
                        .split(",")
                        .map((s) => s.trim());
                    if (parts.length === 2) {
                        const [lngStr, latStr] = parts; // order as stored
                        const lat = parseFloat(latStr);
                        const lng = parseFloat(lngStr);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            const category = classifyField(f.name);
                            parsed.push({
                                lat,
                                lng,
                                label: f.label || f.name,
                                propertyId: p.id,
                                fieldName: f.name,
                                // @ts-ignore augment category temporarily
                                category,
                            });
                        }
                    }
                });
        });

        if (parsed.length) {
            const bounds = new window.naver.maps.LatLngBounds();
            parsed.forEach((loc: any) => {
                const position = new window.naver.maps.LatLng(loc.lat, loc.lng);
                bounds.extend(position);
                const style = markerStyleFor(loc.category);
                const marker = new window.naver.maps.Marker({
                    position,
                    map,
                    title: loc.label || `${loc.propertyId}-${loc.fieldName}`,
                    icon: style,
                    zIndex:
                        loc.category === "primary"
                            ? 10
                            : loc.category === "shuttle"
                            ? 9
                            : 5,
                });
                markersRef.current.push(marker);

                // ---- InfoWindow 내용 생성 (카드 요약 재사용) ----
                const property = properties.find(
                    (p) => p.id === loc.propertyId
                );
                const summaries = property
                    ? buildPropertySummaries(property)
                    : {
                          priceLines: [],
                          facilityLines: [],
                          contactLines: [],
                      };

                const wrap = document.createElement("div");
                wrap.style.padding = "8px 10px";
                wrap.style.maxWidth = "240px";
                wrap.style.fontSize = "12px";
                wrap.style.lineHeight = "1.35";
                wrap.style.fontFamily =
                    "'-apple-system','BlinkMacSystemFont','Segoe UI',Roboto,Helvetica,Arial,sans-serif'";

                const title = document.createElement("div");
                title.style.fontWeight = "600";
                title.style.marginBottom = "4px";
                const propNameField: any =
                    property?.fields.find((f: any) => f.name === "주택명") ||
                    null;
                const propName = (propNameField?.label ||
                    propNameField?.value ||
                    "") as string;
                title.textContent =
                    (propName ? propName : "매물") +
                    (loc.category === "shuttle"
                        ? " - 셔틀 위치"
                        : loc.category === "primary"
                        ? ""
                        : loc.label
                        ? ` - ${loc.label}`
                        : "");
                wrap.appendChild(title);

                const addBlock = (heading: string, lines: string[]) => {
                    if (!lines.length) return;
                    const block = document.createElement("div");
                    block.style.marginBottom = "6px";

                    const h = document.createElement("div");
                    h.textContent = heading;
                    h.style.fontWeight = "500";
                    h.style.color = "#374151";
                    h.style.marginBottom = "2px";
                    block.appendChild(h);

                    lines.forEach((ln) => {
                        const lineEl = document.createElement("div");
                        lineEl.textContent = ln;
                        lineEl.style.whiteSpace = "nowrap";
                        lineEl.style.overflow = "hidden";
                        lineEl.style.textOverflow = "ellipsis";
                        block.appendChild(lineEl);
                    });
                    wrap.appendChild(block);
                };

                addBlock("가격", summaries.priceLines);
                addBlock("시설", summaries.facilityLines);
                addBlock("연락", summaries.contactLines);

                // 위치 필드 간단 표기
                const locLine = document.createElement("div");
                locLine.style.fontSize = "11px";
                locLine.style.opacity = "0.7";
                locLine.textContent = `Field: ${loc.fieldName}${
                    loc.category ? ` (${loc.category})` : ""
                }`;
                wrap.appendChild(locLine);

                const info = new window.naver.maps.InfoWindow({
                    content: wrap,
                    borderWidth: 1,
                });

                // 마우스 오버 시 InfoWindow 열기 (기존 클릭 동작 유지)
                window.naver.maps.Event.addListener(marker, "mouseover", () => {
                    // 이미 열려있는 동일한 창이면 아무 것도 하지 않음
                    if (openInfoRef.current === info) return;
                    // 다른 창이 열려있으면 닫기
                    if (openInfoRef.current && openInfoRef.current !== info) {
                        openInfoRef.current.close();
                    }
                    info.open(map, marker);
                    openInfoRef.current = info;
                });

                // 마우스가 벗어나면(hover 종료) 창 닫기 (사용자가 클릭하여 고정한 경우는 제외)
                window.naver.maps.Event.addListener(marker, "mouseout", () => {
                    // 클릭해서 연 후 바로 mouseout 되는 경우 사용자가 의도적으로 열어둔 것이므로 닫지 않음
                    // 간단한 휴리스틱: 현재 열린 창이 이 info이고, 최근 250ms 이내 클릭 이벤트가 없었다면 닫기
                    // 구현 단순화를 위해 최근 클릭 시간 ref 없이 즉시 닫도록 하고, 필요시 개선
                    if (openInfoRef.current === info) {
                        info.close();
                        openInfoRef.current = null;
                    }
                });

                // 클릭 시 InfoWindow 열기 (하나만 열리도록)
                window.naver.maps.Event.addListener(marker, "click", () => {
                    if (openInfoRef.current && openInfoRef.current !== info) {
                        openInfoRef.current.close();
                    }
                    if (openInfoRef.current === info) {
                        info.close();
                        openInfoRef.current = null;
                    } else {
                        info.open(map, marker);
                        openInfoRef.current = info;
                    }
                });
            });
            // Naver LatLngBounds in v3 does not expose isEmpty() consistently; use parsed length heuristic
            if (parsed.length === 1) {
                const only = parsed[0];
                map.setCenter(new window.naver.maps.LatLng(only.lat, only.lng));
                map.setZoom(16);
            } else {
                try {
                    map.fitBounds(bounds);
                } catch (e) {
                    // fallback: center on first
                    const first = parsed[0];
                    map.setCenter(
                        new window.naver.maps.LatLng(first.lat, first.lng)
                    );
                }
            }
        }
    }, [properties, mapLoaded, mapError]);

    const buildPropertySummaries = React.useCallback((property: Property) => {
        const getField = (name: string) =>
            property.fields.find((f: any) => f.name === name);

        const val = (name: string) => {
            const f: any = getField(name);
            if (!f) return undefined;
            const raw = f.label ?? f.value;
            if (raw === undefined || raw === null || raw === "")
                return undefined;
            return String(raw);
        };

        // 가격 관련
        const price = val("가격");
        const kb = val("KB부동산가격");
        const moveIn = val("입주 가능 연월");
        const negoRaw = val("입주 시점 협의 가능");
        const jeonse = val("전세가");
        const jeonseDate = val("전세가 기준일");
        const negotiable =
            negoRaw === "true" || negoRaw === "Y" || negoRaw === "1";
        const priceLines: string[] = [];
        if (price) {
            priceLines.push(`가격: ${price} 억 원${kb ? ` (KB ${kb}억)` : ""}`);
        }
        if (moveIn) {
            priceLines.push(
                `입주: ${moveIn} (${negotiable ? "협의 가능" : "협의 불가"})`
            );
        }
        if (jeonse) {
            priceLines.push(
                `전세: ${jeonse} 억원${jeonseDate ? ` (${jeonseDate})` : ""}`
            );
        }

        // 시설 관련
        const area = val("전용 면적");
        const rooms = val("방 개수");
        const floor = val("층");
        const evRaw = val("EV");
        const parking = val("주차 대수");
        const households = val("세대 수");
        const built = val("준공연월");
        const ev =
            evRaw === undefined
                ? undefined
                : evRaw === "true" || evRaw === "Y" || evRaw === "1"
                ? "엘리베이터 있음"
                : "엘리베이터 없음";

        const facilityLines: string[] = [];
        const l1Parts: string[] = [];
        if (area) l1Parts.push(`면적 ${area}평`);
        if (rooms) l1Parts.push(`${rooms}룸`);
        if (l1Parts.length) facilityLines.push(l1Parts.join(" "));
        const l2Parts: string[] = [];
        if (floor) l2Parts.push(`${floor}층`);
        if (ev) l2Parts.push(`(${ev})`);
        if (l2Parts.length) facilityLines.push(l2Parts.join(" "));
        // 주차 비율
        if (parking || households) {
            let ratio = "";
            const pNum = Number(parking);
            const hNum = Number(households);
            if (!isNaN(pNum) && !isNaN(hNum) && hNum > 0) {
                ratio = ` (${(pNum / hNum).toFixed(2)})`;
            }
            facilityLines.push(
                `주차: ${parking || "-"} / ${households || "-"}${ratio}`
            );
        }
        if (built) facilityLines.push(`준공: ${built}`);

        // 연락
        const agent = val("공인중개사명");
        const phone = val("연락처");
        const code = val("매물번호");
        const contactLines: string[] = [];
        if (agent || phone)
            contactLines.push(`${agent || "-"}: ${phone || "-"}`);
        if (code) contactLines.push(`매물번호: ${code}`);

        return { priceLines, facilityLines, contactLines };
    }, []);

    return (
        <div ref={mapElement} style={{ width: "100%", height: "100%" }}>
            {mapError && (
                <div>
                    지도 인증에 실패했거나 로딩 중 오류가 발생했습니다. Client
                    ID와 네트워크 연결을 확인해주세요.
                </div>
            )}
            {!mapLoaded && !mapError && <div>지도를 불러오는 중...</div>}
            {mapLoaded && loadingProps && (
                <div className="absolute top-2 left-2 bg-white/80 text-xs px-2 py-1 rounded shadow">
                    매물 불러오는 중...
                </div>
            )}
            {mapLoaded && !loadingProps && properties.length === 0 && (
                <div className="absolute top-2 left-2 bg-white/80 text-xs px-2 py-1 rounded shadow">
                    표시할 매물이 없습니다
                </div>
            )}
            {mapLoaded && !loadingProps && properties.length > 0 && (
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded shadow text-[11px] p-2 flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                        <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{
                                background: "#2563eb",
                                border: "1px solid #1d4ed8",
                            }}
                        />{" "}
                        대표 위치
                    </div>
                    <div className="flex items-center gap-1">
                        <span
                            className="inline-block w-3 h-3 rounded"
                            style={{
                                background: "#10b981",
                                border: "1px solid #059669",
                            }}
                        />{" "}
                        셔틀/승차장
                    </div>
                    <div className="flex items-center gap-1">
                        <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{
                                background: "#6b7280",
                                border: "1px solid #4b5563",
                            }}
                        />{" "}
                        기타 위치
                    </div>
                </div>
            )}
        </div>
    );
}
