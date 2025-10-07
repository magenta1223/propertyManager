import React from "react";

interface FullScreenButtonBarProps {
    onAddProperty: () => void;
    onAddField: () => void;
    onExit: () => void;
    addingField: boolean;
}

const FullScreenButtonBar: React.FC<FullScreenButtonBarProps> = ({
    onAddProperty,
    onAddField,
    onExit,
    addingField,
}) => {
    return (
        <div className="flex gap-2">
            <button
                onClick={onAddProperty}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
                Add Property
            </button>
            <button
                onClick={onAddField}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={addingField}
            >
                {addingField ? "Processing..." : "Add Field"}
            </button>
            <button
                onClick={onExit}
                className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
            >
                Exit Full Screen
            </button>
        </div>
    );
};

export default FullScreenButtonBar;
