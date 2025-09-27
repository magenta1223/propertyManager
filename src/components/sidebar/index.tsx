"use client";

import { useState, useEffect, useMemo } from "react";
import { Property } from "@/models/types";
import FullScreenView from "./FullScreenView";

export type SidebarState = "collapsed" | "expanded" | "full-screen";

interface SidebarProps {
    state: SidebarState;
    setState: (state: SidebarState) => void;
}

export default function Sidebar({ state, setState }: SidebarProps) {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const isFullScreen = state === "full-screen";

    // 데이터 로드 (full-screen 진입 시)
    useEffect(() => {
        if (isFullScreen) {
            setLoading(true);
            fetch("/api/properties")
                .then((res) => res.json())
                .then((data) => {
                    setProperties(data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [isFullScreen]);

    // collapsed / expanded 애니메이션용 클래스 계산
    const containerWidthClass = useMemo(
        () =>
            state === "collapsed"
                ? "w-16"
                : state === "expanded"
                ? "w-64"
                : "w-16",
        [state]
    );

    if (isFullScreen) {
        return (
            <FullScreenView
                onSetState={setState}
                properties={properties}
                loading={loading}
            />
        );
    }

    return (
        <aside
            className={`group relative flex flex-col bg-gray-100 border-r border-gray-200 h-full ${containerWidthClass} transition-all duration-300 ease-in-out`}
            aria-label="Sidebar"
        >
            {/* Toggle button area */}
            <div className="flex items-center justify-between p-3">
                {state === "expanded" && (
                    <h2 className="text-sm font-semibold opacity-0 group-[&:hover]:opacity-100 transition-opacity duration-200">
                        Properties
                    </h2>
                )}
                <button
                    aria-label={
                        state === "collapsed"
                            ? "Expand sidebar"
                            : "Collapse sidebar"
                    }
                    aria-expanded={state === "expanded"}
                    onClick={() =>
                        setState(
                            state === "collapsed" ? "expanded" : "collapsed"
                        )
                    }
                    className="ml-auto p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                    <span aria-hidden="true">
                        {state === "collapsed" ? ">" : "<"}
                    </span>
                </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden">
                {/* Expanded content fades in */}
                <div
                    className={`h-full px-3 pb-4 flex flex-col gap-3 text-sm ${
                        state === "expanded"
                            ? "opacity-100 translate-x-0"
                            : "opacity-0 -translate-x-2 pointer-events-none"
                    } transition-all duration-300 ease-in-out`}
                >
                    <button
                        onClick={() => setState("full-screen")}
                        className="w-full text-left px-2 py-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        aria-label="Open properties in full screen"
                    >
                        Full Screen View
                    </button>
                    <div className="text-gray-500">Property list...</div>
                </div>

                {/* Collapsed icon hint (optional) */}
                {state === "collapsed" && (
                    <div className="flex flex-col items-center text-xs text-gray-500 select-none">
                        <span className="rotate-90">⋮</span>
                    </div>
                )}
            </div>
        </aside>
    );
}
