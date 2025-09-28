import React from "react";
import Modal from "@/components/common/Modal";
import { FieldType, Field } from "@/models/types";

interface FieldAddModalProps {
    open: boolean;
    newField: Partial<Field>;
    setNewField: (f: Partial<Field>) => void;
    nameExists: boolean;
    adding: boolean;
    onAdd: () => void; // parent handles post
    onClose: () => void;
}

const FieldAddModal: React.FC<FieldAddModalProps> = ({
    open,
    newField,
    setNewField,
    nameExists,
    adding,
    onAdd,
    onClose,
}) => {
    return (
        <Modal
            open={open}
            title="Add New Field"
            subtitle="새 필드를 생성합니다. 필요한 값을 입력하세요."
            onDismiss={onClose}
            onCancel={onClose}
            onSave={onAdd}
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
                            setNewField({ ...newField, unit: e.target.value })
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
                            setNewField({ ...newField, name: e.target.value })
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
    );
};

export default FieldAddModal;
