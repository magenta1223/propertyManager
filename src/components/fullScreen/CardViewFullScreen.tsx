"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { Property, Field, FieldType } from "@/models/types";
import { SidebarState } from "../Sidebar";

interface CardViewFullScreenProps {
    onSetState: (s: SidebarState) => void;
}

// 주요 표시 필드 이름 목록 (Korean labels provided by user story)
const CORE_FIELD_NAMES = [
    "주택명", // 이름
    "가격", // 가격
    "입주 가능 연월", // 입주연월
    "전용 면적", // 면적
    "Location", // 위치 (좌표 + label)
    "인접 셔틀버스 승차장", // 인접역 (label 사용)
    "주차 대수", // 주차대수
    "세대 수", // 세대수
];

interface CardDataField {
    id: number;
    name: string;
    value: any;
    label?: string;
    unit?: string;
    type: FieldType | string;
}

interface CardData {
    id: number;
    fields: Record<string, CardDataField | undefined>;
}

const CardViewFullScreen: React.FC<CardViewFullScreenProps> = ({
    onSetState,
}) => {
    const [loading, setLoading] = useState(true);
    const [properties, setProperties] = useState<Property[]>([]);
    const [fields, setFields] = useState<Field[]>([]);
    const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [propsRes, fieldsRes] = await Promise.all([
                    fetch("/api/properties"),
                    fetch("/api/fields"),
                ]);
                if (propsRes.ok) {
                    setProperties(await propsRes.json());
                }
                if (fieldsRes.ok) {
                    setFields(await fieldsRes.json());
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const fieldMapByName = useMemo(() => {
        const map: Record<string, Field> = {};
        fields.forEach((f) => (map[f.name] = f));
        return map;
    }, [fields]);

    const cards: CardData[] = useMemo(() => {
        return properties.map((p) => {
            const byId: Record<number, CardDataField> = {};
            p.fields.forEach((pf: any) => {
                byId[pf.id] = {
                    id: pf.id,
                    name: pf.name,
                    // pf.type might be string from JSON; ensure type fallback
                    type: (pf.type as FieldType) || FieldType.TEXT,
                    value: pf.value,
                    label: pf.label,
                    unit: pf.unit,
                };
            });
            const record: Record<string, CardDataField | undefined> = {};
            CORE_FIELD_NAMES.forEach((fname) => {
                const meta = fieldMapByName[fname];
                if (!meta) {
                    record[fname] = undefined;
                    return;
                }
                // find property field by meta.id
                record[fname] = byId[meta.id];
            });
            return { id: p.id, fields: record };
        });
    }, [properties, fieldMapByName]);

    const renderValue = (f?: CardDataField) => {
        if (!f) return <span className="text-gray-300">—</span>;
        if (f.type === FieldType.BOOLEAN) {
            if (f.value === true || f.value === "true")
                return <span className="text-green-600 font-medium">Y</span>;
            if (f.value === false || f.value === "false" || f.value === "")
                return <span className="text-gray-400">N</span>;
        }
        if (f.type === FieldType.LOCATION) {
            return <span>{f.label || f.value || ""}</span>;
        }
        let display = (f.label ?? f.value ?? "").toString();
        if (!display) return <span className="text-gray-300">—</span>;
        if (f.type === FieldType.NUMBER && f.unit)
            display = `${display} ${f.unit}`;
        return <span title={display}>{display}</span>;
    };

    // Helper: custom composed price info for collapsed preview
    const buildCollapsedPriceBlock = (prop: Property) => {
        // find relevant fields by name
        const findFieldVal = (name: string) => {
            const meta = fields.find((fd) => fd.name === name);
            if (!meta) return undefined;
            const pf: any = prop.fields.find((f) => f.id === meta.id);
            return pf?.value ? String(pf.value) : undefined;
        };
        const price = findFieldVal("가격");
        const kb = findFieldVal("KB부동산가격");
        const moveIn = findFieldVal("입주 가능 연월");
        const negotiableRaw = findFieldVal("입주 시점 협의 가능");
        const jeonse = findFieldVal("전세가");
        const jeonseDate = findFieldVal("전세가 기준일");
        // normalize 협의 가능 여부 (stored as string 'true'/'false')
        const negotiable = negotiableRaw === "true";
        const fmtNum = (val?: string) => {
            if (!val) return undefined;
            return val; // raw 그대로 (억 단위 값 이미 데이터로 관리 가정)
        };
        const priceLine = price
            ? `가격: ${fmtNum(price)} 억 원$${
                  kb ? ` (KB부동산가격 ${fmtNum(kb)}억원)` : ""
              }`.replace("$", "")
            : undefined;
        const moveLine = moveIn
            ? `입주 가능 연월: ${moveIn} (${
                  negotiable ? "협의 가능" : "협의 불가"
              })`
            : undefined;
        const jeonseLine = jeonse
            ? `전세가: ${fmtNum(jeonse)} 억원${
                  jeonseDate ? `(기준일: ${jeonseDate})` : ""
              }`
            : undefined;
        return { priceLine, moveLine, jeonseLine };
    };

    return (
        <div className="fixed inset-0 bg-white z-[1200] p-4 flex flex-col overflow-auto">
            <div className="flex items-center gap-4 mb-4">
                <h2 className="text-2xl font-bold">Card View</h2>
                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() =>
                            setViewMode(
                                viewMode === "grid" ? "compact" : "grid"
                            )
                        }
                        className="px-3 py-1.5 text-sm border rounded bg-gray-50 hover:bg-gray-100"
                    >
                        {viewMode === "grid" ? "Compact" : "Grid"} 모드
                    </button>
                    <button
                        onClick={() => onSetState("expanded")}
                        className="px-3 py-1.5 text-sm border rounded bg-gray-50 hover:bg-gray-100"
                    >
                        닫기
                    </button>
                </div>
            </div>
            {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
            ) : (
                <div
                    className={
                        viewMode === "grid"
                            ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                            : "flex flex-col gap-3"
                    }
                >
                    {cards.map((card) => {
                        const f = card.fields; // alias
                        const isExpanded = expandedId === card.id;
                        const prop = properties.find((p) => p.id === card.id)!;
                        const collapsedPrice = !isExpanded
                            ? buildCollapsedPriceBlock(prop)
                            : null;
                        return (
                            <div
                                key={card.id}
                                className={`relative border rounded-lg shadow-sm bg-white flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer ${
                                    isExpanded ? "ring-2 ring-blue-300" : "p-4"
                                }`}
                                onClick={() =>
                                    setExpandedId(isExpanded ? null : card.id)
                                }
                            >
                                <div className="flex items-start gap-2 p-4 pb-0 w-full">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-semibold truncate">
                                            {renderValue(f["주택명"])}
                                        </h3>
                                        <div className="text-xs text-gray-400">
                                            ID: {card.id}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedId(
                                                isExpanded ? null : card.id
                                            );
                                        }}
                                        aria-label={
                                            isExpanded
                                                ? "Collapse card"
                                                : "Expand card"
                                        }
                                        className="ml-auto text-gray-500 hover:text-gray-700 text-sm px-2 py-1"
                                    >
                                        {isExpanded ? "닫기" : "자세히"}
                                    </button>
                                </div>
                                {!isExpanded && (
                                    <div className="px-4 pb-3 text-[11px] leading-snug space-y-1">
                                        {collapsedPrice?.priceLine && (
                                            <div className="font-medium text-gray-800">
                                                {collapsedPrice.priceLine}
                                            </div>
                                        )}
                                        {collapsedPrice?.moveLine && (
                                            <div className="text-gray-600">
                                                {collapsedPrice.moveLine}
                                            </div>
                                        )}
                                        {collapsedPrice?.jeonseLine && (
                                            <div className="text-gray-600">
                                                {collapsedPrice.jeonseLine}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                                            <div>
                                                <span className="text-gray-400">
                                                    면적{" "}
                                                </span>
                                                <span>
                                                    {renderValue(
                                                        f["전용 면적"]
                                                    )}
                                                </span>
                                            </div>
                                            <div
                                                className="truncate"
                                                title={
                                                    (f["Location"]?.label ||
                                                        f["Location"]
                                                            ?.value) as string
                                                }
                                            >
                                                <span className="text-gray-400">
                                                    위치{" "}
                                                </span>
                                                <span>
                                                    {renderValue(f["Location"])}
                                                </span>
                                            </div>
                                            <div
                                                className="truncate"
                                                title={
                                                    (f["인접 셔틀버스 승차장"]
                                                        ?.label ||
                                                        f[
                                                            "인접 셔틀버스 승차장"
                                                        ]?.value) as string
                                                }
                                            >
                                                <span className="text-gray-400">
                                                    인접역{" "}
                                                </span>
                                                <span>
                                                    {renderValue(
                                                        f[
                                                            "인접 셔틀버스 승차장"
                                                        ]
                                                    )}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">
                                                    주차/세대{" "}
                                                </span>
                                                <span>
                                                    {renderValue(
                                                        f["주차 대수"]
                                                    )}
                                                    /{renderValue(f["세대 수"])}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {isExpanded && (
                                    <div className="px-4 pb-4 text-xs">
                                        <AllFieldsInline
                                            property={prop}
                                            fieldDefs={fields}
                                        />
                                        <div className="flex gap-2 mt-4 flex-wrap">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedId(null);
                                                }}
                                                className="px-2 py-1 text-[11px] bg-gray-100 text-gray-600 rounded border border-gray-300 hover:bg-gray-200"
                                            >
                                                닫기
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {!cards.length && (
                        <div className="text-center text-gray-400 py-10 col-span-full">
                            등록된 매물이 없습니다.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface AllFieldsInlineProps {
    property: Property | null;
    fieldDefs: Field[];
}

// 지도 표시용 컴포넌트 (읽기 전용): 매물 위치 + 인접 셔틀버스 승차장 두 마커 표시
interface DualLocationMapProps {
    primary?: { lng: number; lat: number; label?: string } | null;
    shuttle?: { lng: number; lat: number; label?: string } | null;
    height?: number;
}
const DualLocationMap: React.FC<DualLocationMapProps> = ({
    primary,
    shuttle,
    height = 220,
}) => {
    const mapDivRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const primaryMarkerRef = useRef<any>(null);
    const shuttleMarkerRef = useRef<any>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 스크립트 로드
    useEffect(() => {
        if (typeof window === "undefined") return;
        if ((window as any).naver?.maps) {
            setLoaded(true);
            return;
        }
        const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
        if (!clientId) {
            setError("NAVER MAP Client ID 미설정");
            return;
        }
        const existing = document.querySelector(
            'script[data-naver-maps="true"]'
        );
        if (existing) {
            const intv = setInterval(() => {
                if ((window as any).naver?.maps) {
                    clearInterval(intv);
                    setLoaded(true);
                }
            }, 120);
            return () => clearInterval(intv);
        }
        const s = document.createElement("script");
        s.async = true;
        s.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
        s.setAttribute("data-naver-maps", "true");
        s.onload = () => setLoaded(true);
        s.onerror = () => setError("지도 스크립트 로드 실패");
        document.head.appendChild(s);
    }, []);

    // 지도 초기화 + 마커
    useEffect(() => {
        if (!loaded || !mapDivRef.current || error) return;
        const naver = (window as any).naver;
        if (!naver?.maps) return;

        // 중심 계산
        const primaryLatLng =
            primary &&
            new naver.maps.LatLng(primary.lat as number, primary.lng as number);
        const shuttleLatLng =
            shuttle &&
            new naver.maps.LatLng(shuttle.lat as number, shuttle.lng as number);

        let center = primaryLatLng || shuttleLatLng;
        if (!center) {
            center = new naver.maps.LatLng(37.5665, 126.978);
        }
        if (!mapRef.current) {
            mapRef.current = new naver.maps.Map(mapDivRef.current, {
                center,
                zoom: 14,
            });
        } else if (center) {
            mapRef.current.setCenter(center);
        }
        // 마커 갱신
        if (primaryLatLng) {
            if (!primaryMarkerRef.current) {
                primaryMarkerRef.current = new naver.maps.Marker({
                    position: primaryLatLng,
                    map: mapRef.current,
                    icon: {
                        content: `<div style="transform:translate(-50%,-50%);background:#2563eb;color:#fff;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.3)">매물</div>`,
                    },
                    title: primary?.label || "매물 위치",
                });
            } else {
                primaryMarkerRef.current.setPosition(primaryLatLng);
            }
        }
        if (shuttleLatLng) {
            if (!shuttleMarkerRef.current) {
                shuttleMarkerRef.current = new naver.maps.Marker({
                    position: shuttleLatLng,
                    map: mapRef.current,
                    icon: {
                        content: `<div style="transform:translate(-50%,-50%);background:#059669;color:#fff;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.3)">셔틀</div>`,
                    },
                    title: shuttle?.label || "셔틀 승차장",
                });
            } else {
                shuttleMarkerRef.current.setPosition(shuttleLatLng);
            }
        }
        // 두 점 모두 있을 때 bounds fit
        if (primaryLatLng && shuttleLatLng) {
            const bounds = new naver.maps.LatLngBounds(
                primaryLatLng,
                shuttleLatLng
            );
            mapRef.current.fitBounds(bounds);
        }
    }, [loaded, primary?.lng, primary?.lat, shuttle?.lng, shuttle?.lat, error]);

    return (
        <div className="w-full flex flex-col gap-1">
            <div
                ref={mapDivRef}
                className="w-full rounded border bg-gray-100"
                style={{ height }}
            />
            {error && <div className="text-[11px] text-red-500">{error}</div>}
            {!error && !loaded && (
                <div className="text-[11px] text-gray-400">지도 로딩중...</div>
            )}
            <div className="flex gap-3 items-center mt-1 flex-wrap">
                {primary?.lng !== undefined && primary?.lat !== undefined && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-600">
                        <span className="inline-block w-3 h-3 rounded bg-blue-600" />
                        <span>
                            매물:{" "}
                            {primary.label ||
                                `${primary.lng.toFixed(
                                    4
                                )},${primary.lat.toFixed(4)}`}
                        </span>
                    </div>
                )}
                {shuttle?.lng !== undefined && shuttle?.lat !== undefined && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-600">
                        <span className="inline-block w-3 h-3 rounded bg-emerald-600" />
                        <span>
                            셔틀:{" "}
                            {shuttle.label ||
                                `${shuttle.lng.toFixed(
                                    4
                                )},${shuttle.lat.toFixed(4)}`}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
const AllFieldsInline: React.FC<AllFieldsInlineProps> = ({
    property,
    fieldDefs,
}) => {
    if (!property) return <div className="text-gray-400">데이터 없음</div>;
    // 정렬: fieldDefs 의 order 기준 -> property.fields 매핑
    const orderMap: Record<number, number> = {};
    fieldDefs.forEach((f) => {
        orderMap[f.id] = f.order ?? Number.MAX_SAFE_INTEGER;
    });
    const merged = fieldDefs
        .slice()
        .sort((a, b) => orderMap[a.id] - orderMap[b.id] || a.id - b.id)
        .map((def) => {
            const pf: any = property.fields.find((f) => f.id === def.id);
            return { def: { ...def, group: def.group || "unknown" }, pf };
        });
    // 그룹 버킷 구성
    const buckets: Record<string, { def: Field; pf: any }[]> = {};
    merged.forEach((item) => {
        const g = (item.def.group || "unknown").trim() || "unknown";
        if (!buckets[g]) buckets[g] = [];
        buckets[g].push(item);
    });
    const priority = [
        "기본정보",
        "가격",
        "위치",
        "시설",
        "연락",
        "기타",
        "unknown",
    ]; // 사용자 지정 우선순위
    const groupOrder = Object.keys(buckets).sort((a, b) => {
        const ia =
            priority.indexOf(a) === -1 ? priority.length : priority.indexOf(a);
        const ib =
            priority.indexOf(b) === -1 ? priority.length : priority.indexOf(b);
        if (ia !== ib) return ia - ib;
        return a.localeCompare(b, "ko");
    });
    const formatVal = (def: Field, pf: any) => {
        if (!pf) return <span className="text-gray-300">—</span>;
        if (def.type === FieldType.BOOLEAN) {
            const v = pf.value === true || pf.value === "true";
            return (
                <span className={v ? "text-green-600" : "text-gray-400"}>
                    {v ? "True" : "False"}
                </span>
            );
        }
        if (def.type === FieldType.LOCATION) {
            return <span>{pf.label || pf.value || ""}</span>;
        }
        if (def.type === FieldType.NUMBER) {
            const base = pf.value ?? "";
            return (
                <span>
                    {base}
                    {def.unit ? ` ${def.unit}` : ""}
                </span>
            );
        }
        if (def.type === FieldType.IMAGE) {
            if (!pf.value) return <span className="text-gray-300">—</span>;
            const src = String(pf.value);
            return (
                <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline break-all"
                >
                    이미지 열기
                </a>
            );
        }
        if (def.type === FieldType.URL || def.type === FieldType.TEXT) {
            const value = pf.value ?? "";
            if (!value) return <span className="text-gray-300">—</span>;
            if (def.name === "링크") {
                let url = String(value);
                if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
                return (
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline break-all"
                    >
                        {value}
                    </a>
                );
            }
            return <span className="break-all">{String(value)}</span>;
        }
        if (def.type === FieldType.DATE) {
            const v = pf.value ?? "";
            return v ? (
                <span>{v}</span>
            ) : (
                <span className="text-gray-300">—</span>
            );
        }
        return <span className="break-all">{String(pf.value ?? "")}</span>;
    };
    // Helper for composite price section
    const extract = (name: string) => {
        const def = fieldDefs.find((d) => d.name === name);
        if (!def) return { def: undefined, pf: undefined };
        const pf: any = property.fields.find((f: any) => f.id === def.id);
        return { def, pf };
    };
    const priceData = extract("가격");
    const kbData = extract("KB부동산가격");
    const moveData = extract("입주 가능 연월");
    const negoData = extract("입주 시점 협의 가능");
    const jeonseData = extract("전세가");
    const jeonseDateData = extract("전세가 기준일");
    const boolVal = (raw: any) => raw === true || raw === "true";
    const asText = (raw: any) =>
        raw === undefined || raw === null || raw === ""
            ? undefined
            : String(raw);
    const compositePriceLines: string[] = [];
    const priceVal = asText(priceData.pf?.value);
    if (priceVal) {
        const kbVal = asText(kbData.pf?.value);
        compositePriceLines.push(
            `가격: ${priceVal} 억 원${
                kbVal ? ` (KB부동산가격 ${kbVal}억원)` : ""
            }`
        );
    }
    const moveVal = asText(moveData.pf?.value);
    if (moveVal) {
        const negotiable = boolVal(negoData.pf?.value);
        compositePriceLines.push(
            `입주 가능 연월: ${moveVal} (${
                negotiable ? "협의 가능" : "협의 불가"
            })`
        );
    }
    const jeonseVal = asText(jeonseData.pf?.value);
    if (jeonseVal) {
        const jd = asText(jeonseDateData.pf?.value);
        compositePriceLines.push(
            `전세가: ${jeonseVal} 억원${jd ? `(기준일: ${jd})` : ""}`
        );
    }
    const HIDE_IN_PRICE_COMPOSITE = new Set([
        "가격",
        "KB부동산가격",
        "입주 가능 연월",
        "입주 시점 협의 가능",
        "전세가",
        "전세가 기준일",
    ]);
    // 시설 요약에 포함되는 필드 이름 목록 (요약 후 숨김)
    const FACILITY_COMPOSITE_FIELDS = new Set([
        "전용 면적",
        "방 개수",
        "층",
        "EV",
        "주차 대수",
        "세대 수",
        "준공연월",
    ]);

    // 시설 그룹 합성 문자열 생성
    const buildFacilityComposite = () => {
        const getVal = (n: string) => {
            const def = fieldDefs.find((d) => d.name === n);
            if (!def) return undefined;
            const pf: any = property.fields.find((f: any) => f.id === def.id);
            return pf?.value;
        };
        const asNum = (v: any): number | undefined => {
            if (v === undefined || v === null || v === "") return undefined;
            const num = Number(v);
            return isNaN(num) ? undefined : num;
        };
        const area = getVal("전용 면적");
        const rooms = getVal("방 개수");
        const floor = getVal("층");
        const evRaw = getVal("EV");
        const parking = getVal("주차 대수");
        const households = getVal("세대 수");
        const built = getVal("준공연월");

        const ev =
            evRaw === true || evRaw === "true"
                ? "엘리베이터 있음"
                : "엘레베이터 없음"; // note original spec spelling

        // 1) 전용 면적 X평 Y룸  (평 변환: 1평=3.3㎡ 가정? 제공 데이터 단위가 억/㎡? 일단 값 그대로 + (rooms) )
        // 요구사항에는 단위 변환 명확히 없어 그대로 표기, 필요한 경우 추후 변경
        const line1Parts: string[] = [];
        if (area !== undefined && area !== "")
            line1Parts.push(`전용 면적 ${area} 평`);
        if (rooms !== undefined && rooms !== "") line1Parts.push(`${rooms}룸`);
        const line1 = line1Parts.join(" ");

        // 2) N층 (엘레베이터 있음 / 없음)
        const line2Parts: string[] = [];
        if (floor !== undefined && floor !== "") line2Parts.push(`${floor}층`);
        if (evRaw !== undefined && evRaw !== "") line2Parts.push(`(${ev})`);
        const line2 = line2Parts.join(" ");

        // 3) 주차: 주차/세대 (비율)
        let line3 = "";
        const parkNum = asNum(parking);
        const hhNum = asNum(households);
        if (parkNum !== undefined || hhNum !== undefined) {
            const ratio =
                parkNum !== undefined && hhNum
                    ? ` (${(parkNum / hhNum).toFixed(2)})`
                    : "";
            line3 = `주차: ${parking || "-"}/${households || "-"}${ratio}`;
        }

        // 4) 준공연월:
        const line4 = built ? `준공연월: ${built}` : "";

        return [line1, line2, line3, line4].filter(Boolean);
    };
    const facilityLines = buildFacilityComposite();
    // 연락 그룹 합성 (공인중개사명: 연락처)
    const buildContactComposite = () => {
        const getField = (n: string) => {
            const def = fieldDefs.find((d) => d.name === n);
            if (!def) return undefined;
            return property.fields.find((f: any) => f.id === def.id);
        };
        const agentPf: any = getField("공인중개사명");
        const phonePf: any = getField("연락처");
        const codePf: any = getField("매물번호");
        const agent = agentPf?.value ? String(agentPf.value).trim() : "";
        const phone = phonePf?.value ? String(phonePf.value).trim() : "";
        const code = codePf?.value ? String(codePf.value).trim() : "";
        if (!agent && !phone && !code) return "";
        // 1줄: 공인중개사명: 연락처  (기존)
        const line1 = `${agent || "-"}: ${phone || "-"}`;
        // 2줄: 매물번호 (있을 때만)
        const line2 = code ? `매물번호: ${code}` : "";
        return [line1, line2].filter(Boolean).join("\n");
    };
    const contactLine = buildContactComposite();
    const CONTACT_COMPOSITE_FIELDS = new Set([
        "공인중개사명",
        "연락처",
        "매물번호",
    ]);

    return (
        <div className="mt-2 space-y-6">
            {groupOrder.map((group) => {
                const isPriceGroup = group === "가격";
                const isLocationGroup = group === "위치";
                const isFacilityGroup = group === "시설";
                const isContactGroup = group === "연락";
                // 위치 그룹일 경우 지도에 필요한 좌표 파싱
                let locationPrimary: {
                    lng: number;
                    lat: number;
                    label?: string;
                } | null = null;
                let locationShuttle: {
                    lng: number;
                    lat: number;
                    label?: string;
                } | null = null;
                if (isLocationGroup) {
                    const locDef = fieldDefs.find((d) => d.name === "Location");
                    const shuttleDef = fieldDefs.find(
                        (d) => d.name === "인접 셔틀버스 승차장"
                    );
                    const locPf: any =
                        locDef &&
                        property.fields.find((f: any) => f.id === locDef.id);
                    const shuttlePf: any =
                        shuttleDef &&
                        property.fields.find(
                            (f: any) => f.id === shuttleDef.id
                        );
                    const parseCoord = (raw?: string) => {
                        if (!raw) return null;
                        const parts = raw.split(",");
                        if (parts.length !== 2) return null;
                        const lng = parseFloat(parts[0]);
                        const lat = parseFloat(parts[1]);
                        if (isNaN(lng) || isNaN(lat)) return null;
                        return { lng, lat };
                    };
                    const locCoord = parseCoord(locPf?.value);
                    if (locCoord) {
                        locationPrimary = { ...locCoord, label: locPf?.label };
                    }
                    const shuttleCoord = parseCoord(shuttlePf?.value);
                    if (shuttleCoord) {
                        locationShuttle = {
                            ...shuttleCoord,
                            label: shuttlePf?.label,
                        };
                    }
                }
                return (
                    <div key={group} className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                            <span>{group === "unknown" ? "기타" : group}</span>
                            <span className="h-px bg-gray-200 flex-1" />
                        </h4>
                        {isPriceGroup && compositePriceLines.length > 0 && (
                            <div className="border rounded-md p-3 bg-amber-50 text-[12px] space-y-1">
                                {compositePriceLines.map((line, i) => (
                                    <div
                                        key={i}
                                        className={
                                            i === 0
                                                ? "font-semibold"
                                                : "text-gray-700"
                                        }
                                    >
                                        {line}
                                    </div>
                                ))}
                            </div>
                        )}
                        {isLocationGroup &&
                            (locationPrimary || locationShuttle) && (
                                <DualLocationMap
                                    primary={locationPrimary || undefined}
                                    shuttle={locationShuttle || undefined}
                                />
                            )}
                        {isFacilityGroup && facilityLines.length > 0 && (
                            <div className="border rounded-md p-3 bg-gray-50 text-[12px] space-y-1">
                                {facilityLines.map((l, i) => (
                                    <div
                                        key={i}
                                        className={
                                            i === 0
                                                ? "font-semibold"
                                                : "text-gray-700"
                                        }
                                    >
                                        {l}
                                    </div>
                                ))}
                            </div>
                        )}
                        {isContactGroup && contactLine && (
                            <div className="border rounded-md p-3 bg-gray-50 text-[12px] space-y-1">
                                {contactLine.split("\n").map((ln, i) => (
                                    <div
                                        key={i}
                                        className={
                                            i === 0
                                                ? "font-semibold text-gray-800"
                                                : "text-gray-600"
                                        }
                                    >
                                        {ln}
                                    </div>
                                ))}
                            </div>
                        )}
                        {group === "기본정보" &&
                            (() => {
                                // 기본정보 그룹 내 링크 버튼 위치 (기존 footer 에서 이동)
                                const linkDef = fieldDefs.find(
                                    (fd) => fd.name === "링크"
                                );
                                if (!linkDef) return null;
                                const pf: any = property.fields.find(
                                    (f: any) => f.id === linkDef.id
                                );
                                if (!pf?.value) return null;
                                let url = String(pf.value).trim();
                                if (url && !/^https?:\/\//i.test(url))
                                    url = `https://${url}`;
                                return (
                                    <div className="flex flex-wrap gap-2 -mt-1">
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="px-2 py-1 text-[11px] bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100"
                                        >
                                            링크 열기
                                        </a>
                                    </div>
                                );
                            })()}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {buckets[group]
                                .filter(({ def }) => {
                                    if (
                                        isPriceGroup &&
                                        HIDE_IN_PRICE_COMPOSITE.has(def.name)
                                    )
                                        return false;
                                    // 위치 그룹에서는 지도 위에 이미 요약했으므로 두 location 필드는 숨김
                                    if (
                                        isLocationGroup &&
                                        (def.name === "Location" ||
                                            def.name === "인접 셔틀버스 승차장")
                                    )
                                        return false;
                                    // 시설 그룹에서는 합성 표시 필드 숨김
                                    if (
                                        isFacilityGroup &&
                                        FACILITY_COMPOSITE_FIELDS.has(def.name)
                                    )
                                        return false;
                                    if (
                                        isContactGroup &&
                                        CONTACT_COMPOSITE_FIELDS.has(def.name)
                                    )
                                        return false;
                                    // 기본정보 그룹에서 주택명/링크는 카드 제목 및 버튼으로 대체
                                    if (
                                        group === "기본정보" &&
                                        (def.name === "주택명" ||
                                            def.name === "링크")
                                    )
                                        return false;
                                    return true;
                                })
                                .map(({ def, pf }) => (
                                    <div
                                        key={def.id}
                                        className="border rounded-md p-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="text-[11px] font-semibold text-gray-500 mb-0.5 flex items-center justify-between">
                                            <span>{def.name}</span>
                                            <span className="text-[10px] text-gray-400">
                                                #{def.id}
                                            </span>
                                        </div>
                                        <div className="text-xs sm:text-sm break-all">
                                            {formatVal(def, pf)}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CardViewFullScreen;
