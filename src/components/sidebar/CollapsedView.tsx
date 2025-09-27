import React from "react";
import { SidebarState } from "./index";

interface CollapsedViewProps {
    onSetState: (state: SidebarState) => void;
}

const CollapsedView: React.FC<CollapsedViewProps> = ({ onSetState }) => {
    return (
        <aside
            className="bg-gray-100 p-4 transition-all duration-300 ease-in-out w-16 cursor-pointer"
            onClick={() => onSetState("expanded")}
        >
            <div className="mt-4">
                <span>&gt;</span>
            </div>
        </aside>
    );
};

export default CollapsedView;
