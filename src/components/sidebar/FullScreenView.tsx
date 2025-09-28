import React, { useState, useEffect, useMemo } from "react";
import { Property, Field, FieldType } from "@/models/types";
import AddPropertyModal from "@/components/AddPropertyModal";
import dynamic from "next/dynamic";
import { SidebarState } from "../Sidebar";
import Modal from "@/components/common/Modal";
import { ToastContainer } from "@/components/common/Toast";

interface FullScreenViewProps {
    onSetState: (state: SidebarState) => void;
    properties: Property[];
    loading: boolean;
}

const FullScreenView: React.FC<FullScreenViewProps> = ({
    onSetState,
    properties,
    loading,
}) => {
    const [showAddFieldModal, setShowAddFieldModal] = useState(false);
    const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
    const [newField, setNewField] = useState<Partial<Field>>({
        name: "",
        type: FieldType.TEXT,
        defaultValue: "",
        isRequired: false,
        unit: "",
    });
    const [allFields, setAllFields] = useState<Field[]>([]);
    const [showSuccess, setShowSuccess] = useState(false); // legacy single success toast (will be replaced)
    // Local property state for inline edits
    const [propertyList, setPropertyList] = useState<Property[]>(properties);
    useEffect(() => {
        setPropertyList(properties);
    }, [properties]);

    // Inline editing state: key = `${propertyId}:${fieldId}`
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<any>("");
    const [editingLabel, setEditingLabel] = useState<string>("");
    const [showLocationPicker, setShowLocationPicker] = useState<null | {
        propertyId: number;
        field: Field;
    }>(null);

    const LocationPicker = useMemo(
        () =>
            dynamic(() => import("@/components/LocationPicker"), {
                ssr: false,
            }),
        []
    );

    const startEdit = (
        propertyId: number,
        fieldId: number,
        currentValue: any,
        currentLabel?: string
    ) => {
        const fieldMeta = allFields.find((f) => f.id === fieldId);
        if (fieldMeta?.type === FieldType.LOCATION) {
            setShowLocationPicker({ propertyId, field: fieldMeta });
            let x = "";
            let y = "";
            if (typeof currentValue === "string") {
                const parts = currentValue.split(",");
                x = parts[0] ?? "";
                y = parts[1] ?? "";
            }
            setEditingValue({ x, y });
            setEditingLabel(currentLabel || "");
            setEditingCell(`${propertyId}:${fieldId}`);
            return;
        }
        setEditingCell(`${propertyId}:${fieldId}`);
        setEditingValue(currentValue ?? "");
        // label == value 동기화 (요구사항 1)
        setEditingLabel(String(currentLabel ?? currentValue ?? ""));
    };

    const cancelEdit = () => {
        setEditingCell(null);
        setEditingValue("");
        setEditingLabel("");
    };

    const persistCell = async (propertyId: number, fieldId: number) => {
        try {
            const target = propertyList.find((p) => p.id === propertyId);
            if (!target) return cancelEdit();
            const fieldMeta = allFields.find((f) => f.id === fieldId);
            let finalValue: any = editingValue;
            let finalLabel: string | undefined = editingLabel;
            if (fieldMeta?.type === FieldType.LOCATION) {
                if (editingValue && typeof editingValue === "object") {
                    finalValue = `${editingValue.x ?? ""},${
                        editingValue.y ?? ""
                    }`;
                }
                // LOCATION에서 label이 없으면 value 사용
                if (!finalLabel) finalLabel = finalValue;
            } else {
                // label == value 인 경우만(=동일) 별도 저장 의미 없음 -> label 제거 or 동기화
                if (finalLabel === undefined || finalLabel === "") {
                    finalLabel = finalValue != null ? String(finalValue) : "";
                }
            }
            const updatedFields = target.fields.map((f) =>
                f.id === fieldId
                    ? { ...f, value: finalValue, label: finalLabel }
                    : f
            );
            const updatedProperty: Property = {
                ...target,
                fields: updatedFields,
            };
            // Optimistic UI update
            setPropertyList((prev) =>
                prev.map((p) => (p.id === propertyId ? updatedProperty : p))
            );
            cancelEdit();
            setShowLocationPicker(null);
            const res = await fetch(`/api/properties/${propertyId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedProperty),
            });
            if (!res.ok) {
                addToast({
                    message: `저장 실패: ${res.status}`,
                    variant: "error",
                    duration: 4000,
                });
            } else {
                addToast({
                    message: "저장되었습니다.",
                    variant: "success",
                    duration: 2000,
                });
            }
        } catch (e: any) {
            addToast({
                message: `에러: ${e.message}`,
                variant: "error",
                duration: 4000,
            });
        }
    };

    const handleKeyDown = (
        e: React.KeyboardEvent,
        propertyId: number,
        fieldId: number
    ) => {
        if (e.key === "Enter") {
            e.preventDefault();
            persistCell(propertyId, fieldId);
        } else if (e.key === "Escape") {
            cancelEdit();
        }
    };

    const sortedFields = useMemo(() => {
        return [...allFields].sort((a, b) => {
            const ao = a.order ?? Number.MAX_SAFE_INTEGER;
            const bo = b.order ?? Number.MAX_SAFE_INTEGER;
            if (ao !== bo) return ao - bo;
            return a.id - b.id;
        });
    }, [allFields]);

    // Drag & Drop Reorder
    const [draggingFieldId, setDraggingFieldId] = useState<number | null>(null);
    const handleDragStart = (e: React.DragEvent, fieldId: number) => {
        setDraggingFieldId(fieldId);
        e.dataTransfer.effectAllowed = "move";
    };
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };
    const handleDrop = async (e: React.DragEvent, targetFieldId: number) => {
        e.preventDefault();
        if (draggingFieldId == null || draggingFieldId === targetFieldId)
            return;
        const current = [...sortedFields];
        const fromIdx = current.findIndex((f) => f.id === draggingFieldId);
        const toIdx = current.findIndex((f) => f.id === targetFieldId);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = current.splice(fromIdx, 1);
        current.splice(toIdx, 0, moved);
        // Reassign order sequentially
        const reassigned = current.map((f, i) => ({ ...f, order: i }));
        setAllFields(reassigned);
        setDraggingFieldId(null);
        addToast({
            message: "순서 저장 중...",
            variant: "info",
            duration: 1500,
        });
        // Persist each field order (could be optimized with batch route)
        await Promise.all(
            reassigned.map((f) =>
                fetch(`/api/fields/${f.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ order: f.order }),
                })
            )
        ).catch(() =>
            addToast({
                message: "순서 저장 실패",
                variant: "error",
                duration: 3000,
            })
        );
        addToast({
            message: "필드 순서가 업데이트되었습니다.",
            variant: "success",
            duration: 2000,
        });
    };
    const [toasts, setToasts] = useState<
        {
            id: string;
            message: string;
            variant?: "success" | "error" | "info";
            duration?: number;
        }[]
    >([]);
    const [adding, setAdding] = useState(false);
    const [editingField, setEditingField] = useState<Field | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Field | null>(null);
    const [fieldForm, setFieldForm] = useState<Partial<Field>>({});
    const [savingField, setSavingField] = useState(false);

    const addToast = (t: {
        message: string;
        variant?: "success" | "error" | "info";
        duration?: number;
    }) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts((prev) => [...prev, { id, ...t }]);
    };
    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
    };

    const nameExists = useMemo(() => {
        if (!newField.name?.trim()) return false;
        return allFields.some(
            (f) =>
                f.name.trim().toLowerCase() ===
                newField.name!.trim().toLowerCase()
        );
    }, [newField.name, allFields]);

    // Fetch master field definitions for table headers
    useEffect(() => {
        const fetchFields = async () => {
            try {
                const res = await fetch("/api/fields");
                if (res.ok) {
                    const data: Field[] = await res.json();
                    setAllFields(data);
                }
            } catch (e) {
                console.error("Failed to load fields", e);
            }
        };
        fetchFields();
    }, []);

    const handleAddField = async () => {
        if (nameExists) return; // guard
        setAdding(true);
        try {
            const response = await fetch("/api/fields", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newField),
            });
            if (response.ok) {
                const created: Field = await response.json();
                setAllFields((prev) => [...prev, created]);
                addToast({
                    message: "필드가 추가되었습니다.",
                    variant: "success",
                    duration: 3000,
                });
                setNewField({
                    name: "",
                    type: FieldType.TEXT,
                    defaultValue: "",
                    isRequired: false,
                    unit: "",
                });
                setShowAddFieldModal(false);
            } else {
                const text = await response.text();
                addToast({
                    message: `추가 실패: ${text || response.status}`,
                    variant: "error",
                    duration: 4000,
                });
            }
        } catch (error: any) {
            console.error("Error adding field:", error);
            addToast({
                message: `에러 발생: ${error?.message || "알 수 없는 오류"}`,
                variant: "error",
                duration: 4000,
            });
        } finally {
            setAdding(false);
        }
    };

    const openEditField = (field: Field) => {
        setEditingField(field);
        setFieldForm(field);
    };

    const submitFieldEdit = async () => {
        if (!editingField) return;
        setSavingField(true);
        try {
            const res = await fetch(`/api/fields/${editingField.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(fieldForm),
            });
            if (res.ok) {
                const updated: Field = await res.json();
                setAllFields((prev) =>
                    prev.map((f) => (f.id === updated.id ? updated : f))
                );
                addToast({
                    message: "필드가 수정되었습니다.",
                    variant: "success",
                    duration: 2500,
                });
                setEditingField(null);
            } else {
                addToast({
                    message: `수정 실패: ${res.status}`,
                    variant: "error",
                    duration: 4000,
                });
            }
        } catch (e: any) {
            addToast({
                message: `에러: ${e.message}`,
                variant: "error",
                duration: 4000,
            });
        } finally {
            setSavingField(false);
        }
    };

    const confirmDeleteField = (field: Field) => setDeleteTarget(field);
    const performDeleteField = async () => {
        if (!deleteTarget) return;
        const target = deleteTarget;
        setDeleteTarget(null);
        try {
            const res = await fetch(`/api/fields/${target.id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setAllFields((prev) => prev.filter((f) => f.id !== target.id));
                // Also remove from propertyList fields arrays
                setPropertyList((prev) =>
                    prev.map((p) => ({
                        ...p,
                        fields: p.fields.filter((pf) => pf.id !== target.id),
                    }))
                );
                addToast({
                    message: "필드가 삭제되었습니다.",
                    variant: "success",
                    duration: 2500,
                });
            } else {
                addToast({
                    message: `삭제 실패: ${res.status}`,
                    variant: "error",
                    duration: 4000,
                });
            }
        } catch (e: any) {
            addToast({
                message: `에러: ${e.message}`,
                variant: "error",
                duration: 4000,
            });
        }
    };

    const closeModal = () => {
        setShowAddFieldModal(false);
        setNewField({
            name: "",
            type: FieldType.TEXT,
            defaultValue: "",
            isRequired: false,
            unit: "",
        });
    };

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && showAddFieldModal) closeModal();
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [showAddFieldModal]);

    return (
        <div className="fixed inset-0 bg-white z-[1200] p-4 flex flex-col overflow-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Properties</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddPropertyModal(true)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >
                        Add Property
                    </button>
                    <button
                        onClick={() => setShowAddFieldModal(true)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                        disabled={adding}
                    >
                        {adding ? "Processing..." : "Add Field"}
                    </button>
                    <button
                        onClick={() => onSetState("expanded")}
                        className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                    >
                        Exit Full Screen
                    </button>
                </div>
            </div>
            {loading ? (
                <p>Loading properties...</p>
            ) : (
                <div className="w-full">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ID
                                </th>
                                {sortedFields.map((field) => (
                                    <th
                                        key={field.id}
                                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group relative select-none ${
                                            draggingFieldId === field.id
                                                ? "bg-blue-50 border border-blue-300"
                                                : ""
                                        }`}
                                        draggable
                                        onDragStart={(e) =>
                                            handleDragStart(e, field.id)
                                        }
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, field.id)}
                                    >
                                        <span>{field.name}</span>
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 right-1 flex gap-1 text-[10px] text-gray-400">
                                            <button
                                                onClick={() =>
                                                    openEditField(field)
                                                }
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
                                        <span className="ml-2 cursor-move text-[10px] text-gray-300 group-hover:text-gray-500">
                                            ↕
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {propertyList.map((prop) => {
                                // Build a lookup for quick access
                                const fieldValueMap = prop.fields.reduce<
                                    Record<
                                        number,
                                        {
                                            value: any;
                                            label?: string;
                                            unit?: string;
                                        }
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
                                        {sortedFields.map((field) => {
                                            const cellKey = `${prop.id}:${field.id}`;
                                            const cellData =
                                                fieldValueMap[field.id];
                                            const value = cellData?.value;
                                            const labelDisplay =
                                                cellData?.label || value;
                                            const isEditing =
                                                editingCell === cellKey;
                                            return (
                                                <td
                                                    key={field.id}
                                                    className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 cursor-pointer min-w-[120px]"
                                                    onDoubleClick={() =>
                                                        startEdit(
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
                                                                        setShowLocationPicker(
                                                                            {
                                                                                propertyId:
                                                                                    prop.id,
                                                                                field,
                                                                            }
                                                                        )
                                                                    }
                                                                >
                                                                    좌표 재선택
                                                                </button>
                                                                <input
                                                                    className="w-full px-2 py-1 border border-blue-400 rounded text-gray-900 text-xs"
                                                                    placeholder="주소/레이블"
                                                                    value={
                                                                        editingLabel
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        setEditingLabel(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    onKeyDown={(
                                                                        e
                                                                    ) =>
                                                                        handleKeyDown(
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
                                                                value={
                                                                    editingValue
                                                                }
                                                                onChange={(e) =>
                                                                    setEditingValue(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                onBlur={() =>
                                                                    persistCell(
                                                                        prop.id,
                                                                        field.id
                                                                    )
                                                                }
                                                                onKeyDown={(
                                                                    e
                                                                ) =>
                                                                    handleKeyDown(
                                                                        e,
                                                                        prop.id,
                                                                        field.id
                                                                    )
                                                                }
                                                            />
                                                        )
                                                    ) : value !== undefined ? (
                                                        <span>
                                                            {String(
                                                                labelDisplay
                                                            )}
                                                            {field.unit &&
                                                            labelDisplay !==
                                                                undefined &&
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
                </div>
            )}

            <Modal
                open={showAddFieldModal}
                title="Add New Field"
                subtitle="새 필드를 생성합니다. 필요한 값을 입력하세요."
                onDismiss={closeModal}
                onCancel={closeModal}
                onSave={handleAddField}
                saveText={adding ? "Saving..." : "Add Field"}
                saveDisabled={!newField.name?.trim() || nameExists || adding}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit (Optional)
                        </label>
                        <input
                            type="text"
                            value={newField.unit || ""}
                            onChange={(e) =>
                                setNewField({
                                    ...newField,
                                    unit: e.target.value,
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="예) 억 원, m², km"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Field Name
                        </label>
                        <input
                            type="text"
                            value={newField.name || ""}
                            onChange={(e) =>
                                setNewField({
                                    ...newField,
                                    name: e.target.value,
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter field name"
                        />
                        {nameExists && (
                            <p className="mt-1 text-xs text-red-500">
                                이미 존재하는 필드명입니다.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Field Type
                        </label>
                        <select
                            value={newField.type || FieldType.TEXT}
                            onChange={(e) =>
                                setNewField({
                                    ...newField,
                                    type: e.target.value as FieldType,
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={FieldType.TEXT}>Text</option>
                            <option value={FieldType.NUMBER}>Number</option>
                            <option value={FieldType.BOOLEAN}>Boolean</option>
                            <option value={FieldType.DATE}>Date</option>
                            <option value={FieldType.URL}>URL</option>
                            <option value={FieldType.IMAGE}>Image</option>
                            <option value={FieldType.LOCATION}>Location</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Value
                        </label>
                        <input
                            type="text"
                            value={newField.defaultValue || ""}
                            onChange={(e) =>
                                setNewField({
                                    ...newField,
                                    defaultValue: e.target.value,
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter default value (optional)"
                        />
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="isRequired"
                            checked={newField.isRequired || false}
                            onChange={(e) =>
                                setNewField({
                                    ...newField,
                                    isRequired: e.target.checked,
                                })
                            }
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label
                            htmlFor="isRequired"
                            className="text-sm font-medium text-gray-700"
                        >
                            Required Field
                        </label>
                    </div>
                </div>
            </Modal>

            {/* Edit Field Modal */}
            <Modal
                open={!!editingField}
                title="필드 수정"
                subtitle={editingField ? `ID: ${editingField.id}` : ""}
                onDismiss={() => setEditingField(null)}
                onCancel={() => setEditingField(null)}
                onSave={submitFieldEdit}
                saveText={savingField ? "Saving..." : "Save"}
                saveDisabled={savingField || !fieldForm.name?.trim()}
            >
                {editingField && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Unit (Optional)
                            </label>
                            <input
                                className="w-full px-3 py-2 border rounded-md"
                                value={fieldForm.unit || ""}
                                onChange={(e) =>
                                    setFieldForm({
                                        ...fieldForm,
                                        unit: e.target.value,
                                    })
                                }
                                placeholder="예) 억 원, m², km"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                            </label>
                            <input
                                className="w-full px-3 py-2 border rounded-md"
                                value={fieldForm.name || ""}
                                onChange={(e) =>
                                    setFieldForm({
                                        ...fieldForm,
                                        name: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Default Value
                            </label>
                            <input
                                className="w-full px-3 py-2 border rounded-md"
                                value={fieldForm.defaultValue || ""}
                                onChange={(e) =>
                                    setFieldForm({
                                        ...fieldForm,
                                        defaultValue: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Order
                            </label>
                            <input
                                type="number"
                                min={0}
                                className="w-full px-3 py-2 border rounded-md"
                                value={
                                    fieldForm.order ?? editingField.order ?? 0
                                }
                                onChange={(e) =>
                                    setFieldForm({
                                        ...fieldForm,
                                        order: parseInt(e.target.value, 10),
                                    })
                                }
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                id="editRequired"
                                type="checkbox"
                                checked={
                                    fieldForm.isRequired ??
                                    editingField.isRequired
                                }
                                onChange={(e) =>
                                    setFieldForm({
                                        ...fieldForm,
                                        isRequired: e.target.checked,
                                    })
                                }
                            />
                            <label htmlFor="editRequired" className="text-sm">
                                Required
                            </label>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Field Confirmation */}
            <Modal
                open={!!deleteTarget}
                title="필드 삭제"
                subtitle={
                    deleteTarget
                        ? `정말로 '${deleteTarget.name}' 필드를 삭제하시겠습니까? 되돌릴 수 없습니다.`
                        : ""
                }
                onDismiss={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onSave={performDeleteField}
                saveText="Delete"
                cancelText="Cancel"
                saveDisabled={!deleteTarget}
            >
                <p className="text-sm text-red-600">
                    이 동작은 관련된 모든 Property 데이터에서 해당 필드 값을
                    제거합니다.
                </p>
            </Modal>

            <ToastContainer toasts={toasts} onClose={removeToast} />
            {showLocationPicker && (
                <div
                    className="fixed inset-0 z-[1500] bg-black/40 flex items-center justify-center p-4"
                    onClick={() => {
                        setShowLocationPicker(null);
                        cancelEdit();
                    }}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-semibold mb-2 text-sm">
                            위치 선택 (필드: {showLocationPicker.field.name})
                        </h3>
                        <LocationPicker
                            value={
                                typeof editingValue === "object"
                                    ? {
                                          x: parseFloat(editingValue.x) || 0,
                                          y: parseFloat(editingValue.y) || 0,
                                      }
                                    : undefined
                            }
                            onSelect={(coords, lbl) => {
                                setEditingValue(coords);
                                if (lbl) setEditingLabel(lbl);
                            }}
                            height={360}
                        />
                        <div className="mt-3">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                주소 / 레이블
                            </label>
                            <input
                                type="text"
                                value={editingLabel}
                                onChange={(e) =>
                                    setEditingLabel(e.target.value)
                                }
                                className="w-full px-3 py-2 border rounded text-sm"
                                placeholder="예) 서울특별시 중구 ..."
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                className="px-4 py-2 text-sm rounded border"
                                onClick={() => {
                                    setShowLocationPicker(null);
                                    cancelEdit();
                                }}
                            >
                                취소
                            </button>
                            <button
                                className="px-4 py-2 text-sm rounded bg-blue-600 text-white"
                                onClick={() => {
                                    persistCell(
                                        showLocationPicker.propertyId,
                                        showLocationPicker.field.id
                                    );
                                }}
                            >
                                적용
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <AddPropertyModal
                open={showAddPropertyModal}
                fields={sortedFields}
                onClose={() => setShowAddPropertyModal(false)}
                addToast={addToast}
                onCreated={(created) => {
                    // integrate new property into list
                    setPropertyList((prev) => [...prev, created]);
                }}
            />
        </div>
    );
};

export default FullScreenView;
