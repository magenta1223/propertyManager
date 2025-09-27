"use client";

import { useState } from "react";

type SidebarState = "collapsed" | "expanded" | "full-screen";

export default function Sidebar() {
    const [state, setState] = useState<SidebarState>("collapsed");

    const handleToggleExpand = () => {
        setState((prevState) =>
            prevState === "collapsed" ? "expanded" : "collapsed"
        );
    };

    const handleFullScreen = () => {
        setState("full-screen");
    };

    if (state === "full-screen") {
        return (
            <div className="fixed inset-0 bg-gray-100 z-50 p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Properties</h2>
                    <button
                        onClick={() => setState("expanded")}
                        className="p-2"
                    >
                        Exit Full Screen
                    </button>
                </div>
                {/* Full-screen content goes here */}
                <p>Full-screen Property Cards Grid View</p>
            </div>
        );
    }

    return (
        <aside
            className={`bg-gray-100 p-4 transition-all duration-300 ease-in-out ${
                state === "collapsed" ? "w-16" : "w-64"
            }`}
            onClick={state === "collapsed" ? handleToggleExpand : undefined}
        >
            <div className="flex justify-between items-center">
                <h2
                    className={`text-lg font-semibold ${
                        state === "collapsed" ? "hidden" : "block"
                    }`}
                >
                    Properties
                </h2>
                {state === "expanded" && (
                    <button onClick={handleToggleExpand} className="p-2">
                        &lt;
                    </button>
                )}
            </div>

            {state === "expanded" && (
                <div className="mt-4">
                    <button
                        onClick={handleFullScreen}
                        className="w-full text-left p-2 hover:bg-gray-200 rounded"
                    >
                        Full Screen View
                    </button>
                    {/* Navigation items will go here */}
                    <p>Property list...</p>
                </div>
            )}
            {state === "collapsed" && (
                <div className="mt-4 cursor-pointer">
                    {/* Icon for collapsed state */}
                    <span>&gt;</span>
                </div>
            )}
        </aside>
    );
}
