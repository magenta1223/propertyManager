"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ShuttleStop } from "@/models/types";

interface EditableStop extends ShuttleStop {
    _editing?: boolean;
    _saving?: boolean;
    _deleting?: boolean;
}

const emptyNew = (): Partial<EditableStop> => ({
    name: "",
    label: "",
    coords: { x: 0, y: 0 },
});

// Simple Haversine distance (km) for future reuse
function haversineKm(a: { x: number; y: number }, b: { x: number; y: number }) {
    const R = 6371; // km
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.y - a.y);
    const dLng = toRad(b.x - a.x);
    const lat1 = toRad(a.y);
    const lat2 = toRad(b.y);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
}

export default function ShuttleStopsPage() {
    const [stops, setStops] = useState<EditableStop[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [newStop, setNewStop] = useState<Partial<EditableStop>>(emptyNew());
    const [filter, setFilter] = useState("");
    const [mapOpenFor, setMapOpenFor] = useState<"new" | number | null>(null);
    const ShuttleMapModal = useMemo(
        () =>
            dynamic(
                () =>
                    import(
                        "@/components/common/ShuttleStopLocationPickerModal"
                    ),
                { ssr: false }
            ),
        []
    );

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/shuttle-stops");
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data: ShuttleStop[] = await res.json();
            setStops(data.sort((a, b) => a.id - b.id));
        } catch (e: any) {
            setError(e.message || "로드 실패");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        if (!filter.trim()) return stops;
        const q = filter.trim().toLowerCase();
        return stops.filter(
            (s) =>
                s.name.toLowerCase().includes(q) ||
                s.label.toLowerCase().includes(q)
        );
    }, [stops, filter]);

    const beginEdit = (id: number) =>
        setStops((prev) =>
            prev.map((s) => (s.id === id ? { ...s, _editing: true } : s))
        );
    const cancelEdit = (id: number) => load();
    const updateField = (id: number, field: keyof ShuttleStop, value: any) => {
        setStops((prev) =>
            prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
        );
    };
    const updateCoords = (id: number, key: "x" | "y", v: string) => {
        const num = parseFloat(v);
        if (isNaN(num)) return;
        setStops((prev) =>
            prev.map((s) =>
                s.id === id ? { ...s, coords: { ...s.coords, [key]: num } } : s
            )
        );
    };
    const saveEdit = async (id: number) => {
        setStops((prev) =>
            prev.map((s) => (s.id === id ? { ...s, _saving: true } : s))
        );
        try {
            const target = stops.find((s) => s.id === id);
            if (!target) return;
            const res = await fetch(`/api/shuttle-stops/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: target.name,
                    label: target.label,
                    coords: target.coords,
                }),
            });
            if (!res.ok) throw new Error("수정 실패");
            await load();
        } catch (e: any) {
            alert(e.message || "에러");
            setStops((prev) =>
                prev.map((s) => (s.id === id ? { ...s, _saving: false } : s))
            );
        }
    };
    const deleteStop = async (id: number) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        setStops((prev) =>
            prev.map((s) => (s.id === id ? { ...s, _deleting: true } : s))
        );
        try {
            const res = await fetch(`/api/shuttle-stops/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("삭제 실패");
            await load();
        } catch (e: any) {
            alert(e.message || "에러");
            setStops((prev) =>
                prev.map((s) => (s.id === id ? { ...s, _deleting: false } : s))
            );
        }
    };
    const create = async () => {
        if (!newStop.name?.trim() || !newStop.label?.trim()) {
            alert("이름과 라벨을 입력하세요.");
            return;
        }
        if (
            !newStop.coords ||
            typeof newStop.coords.x !== "number" ||
            typeof newStop.coords.y !== "number"
        ) {
            alert("좌표를 입력하세요.");
            return;
        }
        setCreating(true);
        try {
            const res = await fetch("/api/shuttle-stops", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newStop),
            });
            if (!res.ok) throw new Error("추가 실패");
            setNewStop(emptyNew());
            await load();
        } catch (e: any) {
            alert(e.message || "에러");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-xl font-semibold">셔틀 승차장 관리</h1>
                <button
                    onClick={load}
                    className="px-3 py-1.5 text-sm border rounded bg-gray-50 hover:bg-gray-100"
                >
                    새로고침
                </button>
                <div className="ml-auto flex items-center gap-2">
                    <input
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="검색 (이름/라벨)"
                        className="px-3 py-1.5 border rounded text-sm"
                    />
                </div>
            </div>
            <section className="border rounded-lg p-4 bg-white space-y-3">
                <h2 className="text-sm font-semibold">새 승차장 추가</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <input
                        value={newStop.name}
                        onChange={(e) =>
                            setNewStop((s) => ({ ...s, name: e.target.value }))
                        }
                        placeholder="name"
                        className="px-2 py-1 border rounded text-sm"
                    />
                    <input
                        value={newStop.label}
                        onChange={(e) =>
                            setNewStop((s) => ({ ...s, label: e.target.value }))
                        }
                        placeholder="label"
                        className="px-2 py-1 border rounded text-sm md:col-span-2"
                    />
                    <input
                        value={newStop.coords?.x ?? ""}
                        onChange={(e) =>
                            setNewStop((s) => ({
                                ...s,
                                coords: {
                                    ...(s.coords || { x: 0, y: 0 }),
                                    x: parseFloat(e.target.value) || 0,
                                },
                            }))
                        }
                        placeholder="lng(x)"
                        className="px-2 py-1 border rounded text-sm"
                    />
                    <input
                        value={newStop.coords?.y ?? ""}
                        onChange={(e) =>
                            setNewStop((s) => ({
                                ...s,
                                coords: {
                                    ...(s.coords || { x: 0, y: 0 }),
                                    y: parseFloat(e.target.value) || 0,
                                },
                            }))
                        }
                        placeholder="lat(y)"
                        className="px-2 py-1 border rounded text-sm"
                    />
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setMapOpenFor("new")}
                        className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50"
                    >
                        지도에서 선택
                    </button>
                </div>
                <div>
                    <button
                        onClick={create}
                        disabled={creating}
                        className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white disabled:bg-blue-300"
                    >
                        {creating ? "추가중..." : "추가"}
                    </button>
                </div>
            </section>
            <section className="border rounded-lg bg-white overflow-hidden">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                        <tr>
                            <th className="p-2 border">ID</th>
                            <th className="p-2 border">Name</th>
                            <th className="p-2 border">Label</th>
                            <th className="p-2 border">Lng(x)</th>
                            <th className="p-2 border">Lat(y)</th>
                            <th className="p-2 border">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="p-4 text-center text-gray-400"
                                >
                                    로딩중...
                                </td>
                            </tr>
                        )}
                        {!loading && filtered.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="p-4 text-center text-gray-400"
                                >
                                    데이터 없음
                                </td>
                            </tr>
                        )}
                        {filtered.map((stop) => (
                            <tr key={stop.id} className="hover:bg-gray-50">
                                <td className="p-2 border text-center text-gray-500">
                                    {stop.id}
                                </td>
                                <td className="p-2 border">
                                    {stop._editing ? (
                                        <input
                                            value={stop.name}
                                            onChange={(e) =>
                                                updateField(
                                                    stop.id,
                                                    "name",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-2 py-1 border rounded text-xs"
                                        />
                                    ) : (
                                        stop.name
                                    )}
                                </td>
                                <td className="p-2 border">
                                    {stop._editing ? (
                                        <input
                                            value={stop.label}
                                            onChange={(e) =>
                                                updateField(
                                                    stop.id,
                                                    "label",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-2 py-1 border rounded text-xs"
                                        />
                                    ) : (
                                        <span className="break-all">
                                            {stop.label}
                                        </span>
                                    )}
                                </td>
                                <td className="p-2 border w-[110px]">
                                    {stop._editing ? (
                                        <input
                                            value={stop.coords.x}
                                            onChange={(e) =>
                                                updateCoords(
                                                    stop.id,
                                                    "x",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-1 py-1 border rounded text-xs"
                                        />
                                    ) : (
                                        stop.coords.x.toFixed(6)
                                    )}
                                </td>
                                <td className="p-2 border w-[110px]">
                                    {stop._editing ? (
                                        <input
                                            value={stop.coords.y}
                                            onChange={(e) =>
                                                updateCoords(
                                                    stop.id,
                                                    "y",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full px-1 py-1 border rounded text-xs"
                                        />
                                    ) : (
                                        stop.coords.y.toFixed(6)
                                    )}
                                </td>
                                <td className="p-2 border text-center">
                                    {stop._editing ? (
                                        <div className="flex gap-1 justify-center">
                                            <button
                                                disabled={stop._saving}
                                                onClick={() =>
                                                    saveEdit(stop.id)
                                                }
                                                className="px-2 py-1 text-[11px] rounded bg-emerald-600 text-white disabled:bg-emerald-300"
                                            >
                                                {stop._saving
                                                    ? "저장중"
                                                    : "저장"}
                                            </button>
                                            <button
                                                disabled={stop._saving}
                                                onClick={() =>
                                                    cancelEdit(stop.id)
                                                }
                                                className="px-2 py-1 text-[11px] rounded border"
                                            >
                                                취소
                                            </button>
                                            <button
                                                disabled={stop._saving}
                                                onClick={() =>
                                                    setMapOpenFor(stop.id)
                                                }
                                                className="px-2 py-1 text-[11px] rounded border bg-white"
                                            >
                                                지도
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-1 justify-center">
                                            <button
                                                onClick={() =>
                                                    beginEdit(stop.id)
                                                }
                                                className="px-2 py-1 text-[11px] rounded border"
                                            >
                                                수정
                                            </button>
                                            <button
                                                disabled={stop._deleting}
                                                onClick={() =>
                                                    deleteStop(stop.id)
                                                }
                                                className="px-2 py-1 text-[11px] rounded bg-red-600 text-white disabled:bg-red-300"
                                            >
                                                {stop._deleting
                                                    ? "삭제중"
                                                    : "삭제"}
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            {error && <div className="text-sm text-red-600">에러: {error}</div>}
            <p className="text-[11px] text-gray-400">
                이 페이지는 내부 관리용 셔틀 승차장 마스터 CRUD 화면입니다.
            </p>
            <ShuttleMapModal
                open={mapOpenFor !== null}
                onClose={() => setMapOpenFor(null)}
                value={(() => {
                    if (mapOpenFor === "new")
                        return newStop.coords || undefined;
                    if (typeof mapOpenFor === "number") {
                        const s = stops.find((st) => st.id === mapOpenFor);
                        return s?.coords;
                    }
                    return undefined;
                })()}
                onSelect={(coords) => {
                    if (mapOpenFor === "new") {
                        setNewStop((s) => ({ ...(s || {}), coords }));
                    } else if (typeof mapOpenFor === "number") {
                        setStops((prev) =>
                            prev.map((st) =>
                                st.id === mapOpenFor ? { ...st, coords } : st
                            )
                        );
                    }
                }}
            />
        </div>
    );
}
