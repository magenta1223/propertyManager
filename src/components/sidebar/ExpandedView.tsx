import React from "react";
import { SidebarState } from "./index";

interface ExpandedViewProps {
    onSetState: (state: SidebarState) => void;
}

const ExpandedView: React.FC<ExpandedViewProps> = ({ onSetState }) => {
    return (
        <aside className="bg-gray-100 p-4 transition-all duration-300 ease-in-out w-64">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Properties</h2>
                <button onClick={() => onSetState("collapsed")} className="p-2">
                    &lt;
                </button>
            </div>
            <div className="mt-4">
                <button
                    onClick={() => onSetState("full-screen")}
                    className="w-full text-left p-2 hover:bg-gray-200 rounded"
                >
                    Full Screen View
                </button>
                <p>Property list...</p>
            </div>
        </aside>
    );
};

export default ExpandedView;
