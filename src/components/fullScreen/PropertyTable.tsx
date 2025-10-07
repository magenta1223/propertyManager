import React, { useEffect, useState } from "react";
import { Property, Field, FieldType, ShuttleStop } from "@/models/types";

interface PropertyTableProps {
    properties: Property[];
    fields: Field[]; // already sorted
    editingCell: string | null;
    editingValue: any;
    editingLabel: string;
    draggingFieldId: number | null;
    // Filtering
    filters: Record<string | number, any>;
    onChangeFilter: (
        fieldId: number | "__id__",
        patch: Record<string, any>
    ) => void;
    onResetFilters: () => void;
    onStartEdit: (
        propertyId: number,
        fieldId: number,
        currentValue: any,
        currentLabel?: string
    ) => void;
    onOpenMapPicker: (
        propertyId: number,
        fieldId: number,
        currentValue: any,
        currentLabel?: string
    ) => void;
    onEditingValueChange: (val: any) => void;
    onEditingLabelChange: (val: string) => void;
    onPersist: (propertyId: number, fieldId: number) => void;
    onKeyDown: (
        e: React.KeyboardEvent,
        propertyId: number,
        fieldId: number
    ) => void;
    onDragStart: (e: React.DragEvent, fieldId: number) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, targetFieldId: number) => void;
    openEditField: (field: Field) => void;
    confirmDeleteField: (field: Field) => void;
}

/**
 * PropertyTable
 *  - Displays dynamic field headers (draggable for reordering)
 *  - Supports inline cell editing (delegated state to parent)
 */
const PropertyTable: React.FC<PropertyTableProps> = ({
    properties,
    fields,
    editingCell,
    editingValue,
    editingLabel,
    draggingFieldId,
    filters,
    onChangeFilter,
    onResetFilters,
    onStartEdit,
    onEditingValueChange,
    onEditingLabelChange,
    onPersist,
    onKeyDown,
    onDragStart,
    onDragOver,
    onDrop,
    openEditField,
    confirmDeleteField,
    onOpenMapPicker,
}) => {
    // Shuttle stop master data (lazy loaded only if needed)
    const [shuttleStops, setShuttleStops] = useState<ShuttleStop[]>([]);
    const [shuttleStopsLoaded, setShuttleStopsLoaded] = useState(false);

    // Load shuttle stops when a LOCATION field named '인접 셔틀버스 승차장' enters edit mode
    useEffect(() => {
        if (!editingCell) return;
        const [propIdStr, fieldIdStr] = editingCell.split(":");
        const fieldId = Number(fieldIdStr);
        const fieldMeta = fields.find((f) => f.id === fieldId);
        if (
            fieldMeta &&
            fieldMeta.type === FieldType.LOCATION &&
            fieldMeta.name === "인접 셔틀버스 승차장" &&
            !shuttleStopsLoaded
        ) {
            (async () => {
                try {
                    const res = await fetch("/api/shuttle-stops");
                    if (res.ok) {
                        const data: ShuttleStop[] = await res.json();
                        setShuttleStops(data);
                    }
                } catch (e) {
                    console.warn("Failed to load shuttle stops", e);
                } finally {
                    setShuttleStopsLoaded(true);
                }
            })();
        }
    }, [editingCell, fields, shuttleStopsLoaded]);

    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        ID
                    </th>
                    {fields.map((field) => (
                        <th
                            key={field.id}
                            className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group relative select-none min-w-[120px] ${
                                draggingFieldId === field.id
                                    ? "bg-blue-50 border border-blue-300"
                                    : ""
                            }`}
                            draggable
                            onDragStart={(e) => onDragStart(e, field.id)}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, field.id)}
                        >
                            <div className="flex items-center gap-1">
                                <span>{field.name}</span>
                                <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 text-[10px] text-gray-400">
                                    <button
                                        onClick={() => openEditField(field)}
                                        className="hover:text-blue-600"
                                        title="Edit Field"
                                    >
                                        ✎
                                    </button>
                                    <button
                                        onClick={() =>
                                            confirmDeleteField(field)
                                        }
                                        className="hover:text-red-600"
                                        title="Delete Field"
                                    >
                                        🗑
                                    </button>
                                </span>
                                <span className="cursor-move text-[10px] text-gray-300 group-hover:text-gray-500">
                                    ↕
                                </span>
                            </div>
                        </th>
                    ))}
                </tr>
                {/* Filter row */}
                <tr className="border-t border-gray-200 bg-white/70">
                    <th className="px-4 py-1">
                        <input
                            className="w-full px-1 py-0.5 border rounded text-[11px]"
                            placeholder="검색"
                            value={filters["__id__"]?.contains || ""}
                            onChange={(e) =>
                                onChangeFilter("__id__", {
                                    contains: e.target.value,
                                })
                            }
                        />
                    </th>
                    {fields.map((field) => {
                        const f = filters[field.id] || {};
                        switch (field.type) {
                            case FieldType.NUMBER:
                                return (
                                    <th key={field.id} className="px-1 py-1">
                                        <div className="flex gap-1">
                                            <input
                                                className="w-1/2 px-1 py-0.5 border rounded text-[11px]"
                                                placeholder="min"
                                                value={f.min || ""}
                                                onChange={(e) =>
                                                    onChangeFilter(field.id, {
                                                        min: e.target.value,
                                                    })
                                                }
                                            />
                                            <input
                                                className="w-1/2 px-1 py-0.5 border rounded text-[11px]"
                                                placeholder="max"
                                                value={f.max || ""}
                                                onChange={(e) =>
                                                    onChangeFilter(field.id, {
                                                        max: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </th>
                                );
                            case FieldType.DATE:
                                return (
                                    <th key={field.id} className="px-1 py-1">
                                        <div className="flex flex-col gap-0.5">
                                            <input
                                                type="date"
                                                className="w-full px-1 py-0.5 border rounded text-[11px]"
                                                value={f.from || ""}
                                                onChange={(e) =>
                                                    onChangeFilter(field.id, {
                                                        from: e.target.value,
                                                    })
                                                }
                                            />
                                            <input
                                                type="date"
                                                className="w-full px-1 py-0.5 border rounded text-[11px]"
                                                value={f.to || ""}
                                                onChange={(e) =>
                                                    onChangeFilter(field.id, {
                                                        to: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </th>
                                );
                            case FieldType.BOOLEAN:
                                return (
                                    <th key={field.id} className="px-1 py-1">
                                        <select
                                            className="w-full px-1 py-0.5 border rounded text-[11px] bg-white"
                                            value={f.bool || ""}
                                            onChange={(e) =>
                                                onChangeFilter(field.id, {
                                                    bool: e.target.value,
                                                })
                                            }
                                        >
                                            <option value="">전체</option>
                                            <option value="true">True</option>
                                            <option value="false">False</option>
                                        </select>
                                    </th>
                                );
                            default:
                                return (
                                    <th key={field.id} className="px-1 py-1">
                                        <input
                                            className="w-full px-1 py-0.5 border rounded text-[11px]"
                                            placeholder="검색"
                                            value={f.contains || ""}
                                            onChange={(e) =>
                                                onChangeFilter(field.id, {
                                                    contains: e.target.value,
                                                })
                                            }
                                        />
                                    </th>
                                );
                        }
                    })}
                </tr>
                <tr>
                    <th
                        colSpan={fields.length + 1}
                        className="bg-white px-4 py-1 text-right"
                    >
                        <button
                            onClick={onResetFilters}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] border rounded bg-gray-100 hover:bg-gray-200"
                            title="필터 초기화"
                        >
                            필터 초기화
                        </button>
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {properties.map((prop) => {
                    const fieldValueMap = prop.fields.reduce<
                        Record<
                            number,
                            { value: any; label?: string; unit?: string }
                        >
                    >((acc, f) => {
                        acc[f.id] = {
                            value: f.value,
                            label: (f as any).label,
                            unit: f.unit,
                        };
                        return acc;
                    }, {});
                    return (
                        <tr key={prop.id}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {prop.id}
                            </td>
                            {fields.map((field) => {
                                const cellKey = `${prop.id}:${field.id}`;
                                const cellData = fieldValueMap[field.id];
                                const value = cellData?.value;
                                // LOCATION 타입만 label(주소 등) 우선 표시, 그 외는 value 사용
                                const labelDisplay =
                                    field.type === FieldType.LOCATION
                                        ? cellData?.label || value
                                        : value;
                                const isEditing = editingCell === cellKey;
                                return (
                                    <td
                                        key={field.id}
                                        className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 cursor-pointer min-w-[120px]"
                                        onDoubleClick={() =>
                                            onStartEdit(
                                                prop.id,
                                                field.id,
                                                value,
                                                cellData?.label
                                            )
                                        }
                                    >
                                        {isEditing ? (
                                            field.type ===
                                            FieldType.LOCATION ? (
                                                field.name ===
                                                "인접 셔틀버스 승차장" ? (
                                                    <div className="flex flex-col gap-1">
                                                        <select
                                                            autoFocus
                                                            className="w-full px-2 py-1 border border-blue-400 rounded text-gray-900 text-xs bg-white"
                                                            value={(() => {
                                                                if (
                                                                    editingValue &&
                                                                    typeof editingValue ===
                                                                        "object" &&
                                                                    "x" in
                                                                        editingValue &&
                                                                    "y" in
                                                                        editingValue
                                                                ) {
                                                                    return `${editingValue.x},${editingValue.y}`;
                                                                }
                                                                if (
                                                                    typeof editingValue ===
                                                                        "string" &&
                                                                    editingValue.includes(
                                                                        ","
                                                                    )
                                                                ) {
                                                                    return editingValue;
                                                                }
                                                                return "";
                                                            })()}
                                                            onChange={(e) => {
                                                                const val =
                                                                    e.target
                                                                        .value; // "x,y"
                                                                if (!val) {
                                                                    onEditingValueChange(
                                                                        {
                                                                            x: "",
                                                                            y: "",
                                                                        }
                                                                    );
                                                                    onEditingLabelChange(
                                                                        ""
                                                                    );
                                                                    return;
                                                                }
                                                                const [x, y] =
                                                                    val.split(
                                                                        ","
                                                                    );
                                                                const stop =
                                                                    shuttleStops.find(
                                                                        (s) =>
                                                                            `${s.coords.x},${s.coords.y}` ===
                                                                            val
                                                                    );
                                                                onEditingValueChange(
                                                                    { x, y }
                                                                );
                                                                onEditingLabelChange(
                                                                    stop?.label ||
                                                                        stop?.name ||
                                                                        val
                                                                );
                                                            }}
                                                            onKeyDown={(e) =>
                                                                onKeyDown(
                                                                    e,
                                                                    prop.id,
                                                                    field.id
                                                                )
                                                            }
                                                        >
                                                            <option value="">
                                                                셔틀 정류장 선택
                                                            </option>
                                                            {shuttleStops.map(
                                                                (s) => (
                                                                    <option
                                                                        key={
                                                                            s.id
                                                                        }
                                                                        value={`${s.coords.x},${s.coords.y}`}
                                                                    >
                                                                        {s.label ||
                                                                            s.name}
                                                                    </option>
                                                                )
                                                            )}
                                                        </select>
                                                        <div className="flex gap-1">
                                                            <button
                                                                className="flex-1 px-2 py-1 border rounded text-xs bg-green-50 text-green-600 hover:bg-green-100"
                                                                onClick={() =>
                                                                    onPersist(
                                                                        prop.id,
                                                                        field.id
                                                                    )
                                                                }
                                                            >
                                                                저장
                                                            </button>
                                                            <button
                                                                className="flex-1 px-2 py-1 border rounded text-xs bg-gray-50 hover:bg-gray-100"
                                                                onClick={() =>
                                                                    onOpenMapPicker(
                                                                        prop.id,
                                                                        field.id,
                                                                        value,
                                                                        cellData?.label
                                                                    )
                                                                }
                                                                title="지도에서 좌표 선택"
                                                            >
                                                                지도 선택
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        <button
                                                            className="px-2 py-1 border rounded bg-blue-50 text-blue-600 text-xs"
                                                            onClick={() =>
                                                                onStartEdit(
                                                                    prop.id,
                                                                    field.id,
                                                                    value,
                                                                    cellData?.label
                                                                )
                                                            }
                                                        >
                                                            좌표 재선택
                                                        </button>
                                                        <input
                                                            className="w-full px-2 py-1 border border-blue-400 rounded text-gray-900 text-xs"
                                                            placeholder="주소/레이블"
                                                            value={editingLabel}
                                                            onChange={(e) =>
                                                                onEditingLabelChange(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            onKeyDown={(e) =>
                                                                onKeyDown(
                                                                    e,
                                                                    prop.id,
                                                                    field.id
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                )
                                            ) : (
                                                <input
                                                    autoFocus
                                                    className="w-full px-2 py-1 border border-blue-400 rounded text-gray-900 text-sm"
                                                    value={editingValue}
                                                    onChange={(e) =>
                                                        onEditingValueChange(
                                                            e.target.value
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        onPersist(
                                                            prop.id,
                                                            field.id
                                                        )
                                                    }
                                                    onKeyDown={(e) =>
                                                        onKeyDown(
                                                            e,
                                                            prop.id,
                                                            field.id
                                                        )
                                                    }
                                                />
                                            )
                                        ) : value !== undefined ? (
                                            field.name === "링크" && value ? (
                                                <button
                                                    className="px-2 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // open link in new tab (ensure protocol exists)
                                                        const url = String(
                                                            value
                                                        ).startsWith("http")
                                                            ? String(value)
                                                            : `https://${String(
                                                                  value
                                                              )}`;
                                                        window.open(
                                                            url,
                                                            "_blank"
                                                        );
                                                    }}
                                                    title={String(value)}
                                                >
                                                    바로가기
                                                </button>
                                            ) : (
                                                <span>
                                                    {String(labelDisplay)}
                                                    {field.unit &&
                                                    labelDisplay !==
                                                        undefined &&
                                                    labelDisplay !== ""
                                                        ? ` ${field.unit}`
                                                        : ""}
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-gray-300">
                                                —
                                            </span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

export default PropertyTable;
