import React, { useState, useEffect } from "react";
import { Property, Field, FieldType } from "@/models/types";
import { SidebarState } from "../Sidebar";
import Modal from "@/components/Modal";

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
    const [newField, setNewField] = useState<Partial<Field>>({
        name: "",
        type: FieldType.TEXT,
        defaultValue: "",
        isRequired: false,
    });

    const handleAddField = async () => {
        try {
            const response = await fetch("/api/fields", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newField),
            });
            if (response.ok) {
                setNewField({
                    name: "",
                    type: FieldType.TEXT,
                    defaultValue: "",
                    isRequired: false,
                });
                setShowAddFieldModal(false);
                window.location.reload();
            }
        } catch (error) {
            console.error("Error adding field:", error);
        }
    };

    const closeModal = () => {
        setShowAddFieldModal(false);
        setNewField({
            name: "",
            type: FieldType.TEXT,
            defaultValue: "",
            isRequired: false,
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
                        onClick={() => setShowAddFieldModal(true)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                    >
                        Add New Field
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
                                {properties[0]?.fields.map((field) => (
                                    <th
                                        key={field.id}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        {field.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {properties.map((prop) => (
                                <tr key={prop.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {prop.id}
                                    </td>
                                    {prop.fields.map((field) => (
                                        <td
                                            key={field.id}
                                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                        >
                                            {String(field.value)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
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
                saveText="Add Field"
                saveDisabled={!newField.name?.trim()}
            >
                <div className="space-y-4">
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
        </div>
    );
};

export default FullScreenView;
