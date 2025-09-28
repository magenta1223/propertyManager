import React from "react";
import Modal from "@/components/common/Modal";
import { Field } from "@/models/types";

interface FieldEditModalProps {
    editingField: Field | null;
    fieldForm: Partial<Field>;
    setFieldForm: (f: Partial<Field>) => void;
    savingField: boolean;
    onSave: () => void;
    onClose: () => void;
}

const FieldEditModal: React.FC<FieldEditModalProps> = ({
    editingField,
    fieldForm,
    setFieldForm,
    savingField,
    onSave,
    onClose,
}) => {
    return (
        <Modal
            open={!!editingField}
            title="필드 수정"
            subtitle={editingField ? `ID: ${editingField.id}` : ""}
            onDismiss={onClose}
            onCancel={onClose}
            onSave={onSave}
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
                            value={fieldForm.order ?? editingField.order ?? 0}
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
                                fieldForm.isRequired ?? editingField.isRequired
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
    );
};

export default FieldEditModal;
