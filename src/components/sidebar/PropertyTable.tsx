import React from "react";
import { Property, Field, FieldType } from "@/models/types";

interface PropertyTableProps {
    properties: Property[];
    fields: Field[]; // already sorted
    editingCell: string | null;
    editingValue: any;
    editingLabel: string;
    draggingFieldId: number | null;
    onStartEdit: (
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
}) => {
    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                    </th>
                    {fields.map((field) => (
                        <th
                            key={field.id}
                            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group relative select-none ${
                                draggingFieldId === field.id
                                    ? "bg-blue-50 border border-blue-300"
                                    : ""
                            }`}
                            draggable
                            onDragStart={(e) => onDragStart(e, field.id)}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, field.id)}
                        >
                            <span>{field.name}</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 right-1 flex gap-1 text-[10px] text-gray-400">
                                <button
                                    onClick={() => openEditField(field)}
                                    className="hover:text-blue-600"
                                    title="Edit Field"
                                >
                                    ✎
                                </button>
                                <button
                                    onClick={() => confirmDeleteField(field)}
                                    className="hover:text-red-600"
                                    title="Delete Field"
                                >
                                    🗑
                                </button>
                            </span>
                            <span className="ml-2 cursor-move text-[10px] text-gray-300 group-hover:text-gray-500">
                                ↕
                            </span>
                        </th>
                    ))}
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {prop.id}
                            </td>
                            {fields.map((field) => {
                                const cellKey = `${prop.id}:${field.id}`;
                                const cellData = fieldValueMap[field.id];
                                const value = cellData?.value;
                                const labelDisplay = cellData?.label || value;
                                const isEditing = editingCell === cellKey;
                                return (
                                    <td
                                        key={field.id}
                                        className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 cursor-pointer min-w-[120px]"
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
                                                                e.target.value
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
                                            <span>
                                                {String(labelDisplay)}
                                                {field.unit &&
                                                labelDisplay !== undefined &&
                                                labelDisplay !== ""
                                                    ? ` ${field.unit}`
                                                    : ""}
                                            </span>
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
