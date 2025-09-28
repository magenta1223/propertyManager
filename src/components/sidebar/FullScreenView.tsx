import React, { useState, useEffect, useMemo } from "react";
import { Property, Field, FieldType } from "@/models/types";
import AddPropertyModal from "@/components/AddPropertyModal";
import { SidebarState } from "../Sidebar";
import { ToastContainer } from "@/components/common/Toast";
import PropertyTable from "./PropertyTable";
import FieldAddModal from "./FieldAddModal";
import FieldEditModal from "./FieldEditModal";
import FieldDeleteConfirmModal from "./FieldDeleteConfirmModal";
import FullScreenButtonBar from "./FullScreenButtonBar";
import LocationPickerModal from "./LocationPickerModal";

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

    // (dynamic LocationPicker now handled inside LocationPickerModal)

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
                <FullScreenButtonBar
                    onAddProperty={() => setShowAddPropertyModal(true)}
                    onAddField={() => setShowAddFieldModal(true)}
                    onExit={() => onSetState("expanded")}
                    addingField={adding}
                />
            </div>
            {loading ? (
                <p>Loading properties...</p>
            ) : (
                <div className="w-full">
                    <PropertyTable
                        properties={propertyList}
                        fields={sortedFields}
                        editingCell={editingCell}
                        editingValue={editingValue}
                        editingLabel={editingLabel}
                        draggingFieldId={draggingFieldId}
                        onStartEdit={startEdit}
                        onEditingValueChange={setEditingValue}
                        onEditingLabelChange={setEditingLabel}
                        onPersist={persistCell}
                        onKeyDown={handleKeyDown}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        openEditField={openEditField}
                        confirmDeleteField={confirmDeleteField}
                    />
                </div>
            )}

            <FieldAddModal
                open={showAddFieldModal}
                newField={newField}
                setNewField={setNewField}
                nameExists={nameExists}
                adding={adding}
                onAdd={handleAddField}
                onClose={closeModal}
            />

            {/* Edit Field Modal */}
            <FieldEditModal
                editingField={editingField}
                fieldForm={fieldForm}
                setFieldForm={setFieldForm}
                savingField={savingField}
                onSave={submitFieldEdit}
                onClose={() => setEditingField(null)}
            />

            {/* Delete Field Confirmation */}
            <FieldDeleteConfirmModal
                deleteTarget={deleteTarget}
                onConfirm={performDeleteField}
                onCancel={() => setDeleteTarget(null)}
            />

            <ToastContainer toasts={toasts} onClose={removeToast} />
            <LocationPickerModal
                open={!!showLocationPicker}
                field={showLocationPicker?.field || null}
                editingValue={editingValue}
                editingLabel={editingLabel}
                onChangeValue={setEditingValue}
                onChangeLabel={setEditingLabel}
                onCancel={() => {
                    setShowLocationPicker(null);
                    cancelEdit();
                }}
                onApply={() => {
                    if (showLocationPicker)
                        persistCell(
                            showLocationPicker.propertyId,
                            showLocationPicker.field.id
                        );
                }}
            />
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
