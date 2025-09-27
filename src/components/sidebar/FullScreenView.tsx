import React from "react";
import { Property } from "@/models/types";
import { SidebarState } from "./index";

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
    return (
        <div className="fixed inset-0 bg-white z-50 p-4 overflow-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Properties</h2>
                <button
                    onClick={() => onSetState("expanded")}
                    className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                    Exit Full Screen
                </button>
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
        </div>
    );
};

export default FullScreenView;
