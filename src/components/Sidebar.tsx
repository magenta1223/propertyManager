"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Property } from "@/models/types";
import FullScreenView from "./sidebar/FullScreenView";

export type SidebarState = "collapsed" | "expanded" | "full-screen";

interface SidebarProps {
    state: SidebarState;
    setState: (state: SidebarState) => void;
}

export default function Sidebar({ state, setState }: SidebarProps) {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const isFullScreen = state === "full-screen";
    // staged full-screen transition flags
    const [pendingFull, setPendingFull] = useState(false); // user clicked but not yet expanded fully
    const [animatingToFull, setAnimatingToFull] = useState(false); // width animation to 100vw in progress
    // reverse animation flags
    const [exitingFull, setExitingFull] = useState(false); // true after user requests exit while in full-screen
    const [shrinkingFromFull, setShrinkingFromFull] = useState(false); // triggers w-screen -> w-64 animation
    const widthAnimTimeoutRef = useRef<number | null>(null);
    const finalSwitchTimeoutRef = useRef<number | null>(null);
    const exitInitialTimeoutRef = useRef<number | null>(null);
    const exitShrinkTimeoutRef = useRef<number | null>(null);

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

    const containerWidthClass = useMemo(() => {
        if (shrinkingFromFull) return "w-screen"; // initial frame of shrink (next frame sets to expanded width)
        if (animatingToFull) return "w-screen"; // animating to full
        if (pendingFull) return "w-64"; // ensure expanded first
        if (state === "collapsed") return "w-16";
        if (state === "expanded") return "w-64";
        return "w-16";
    }, [state, pendingFull, animatingToFull, shrinkingFromFull]);

    // Handle click for full-screen with staged animation
    const startFullScreenTransition = () => {
        // If already animating or full-screen, ignore
        if (isFullScreen || pendingFull || animatingToFull) return;
        // Step 1: if currently collapsed, expand first
        if (state === "collapsed") {
            setPendingFull(true);
            setState("expanded");
        } else {
            // directly mark pending
            setPendingFull(true);
        }
    };

    // When sidebar state becomes expanded AND pendingFull true, start width expansion to full viewport
    useEffect(() => {
        if (
            pendingFull &&
            !animatingToFull &&
            state === "expanded" &&
            !isFullScreen
        ) {
            // small delay to allow width 64px frame to paint, then trigger w-screen
            const id = window.setTimeout(() => {
                setAnimatingToFull(true);
                // after animation duration (match 300ms), switch to real full-screen component
                const doneId = window.setTimeout(() => {
                    setAnimatingToFull(false);
                    setPendingFull(false);
                    setState("full-screen");
                }, 300); // duration must match transition class
                finalSwitchTimeoutRef.current = doneId;
            }, 30); // slight delay to create separate transition step
            widthAnimTimeoutRef.current = id;
        }
    }, [pendingFull, animatingToFull, state, isFullScreen, setState]);

    // Reverse (exit full screen) transition
    const startExitFullScreen = () => {
        if (!isFullScreen || exitingFull) return;
        setExitingFull(true);
        // First leave full-screen state after a tick so we can animate in sidebar context
        const t1 = window.setTimeout(() => {
            setState("expanded");
            setShrinkingFromFull(true); // render w-screen inside sidebar context
            // next frame -> switch to w-64 to animate shrink
            const raf = requestAnimationFrame(() => {
                setShrinkingFromFull(false); // containerWidthClass now resolves to w-64 -> shrink animation
            });
            // After transition duration, clear flags
            const t2 = window.setTimeout(() => {
                setExitingFull(false);
            }, 300);
            exitShrinkTimeoutRef.current = t2;
            exitInitialTimeoutRef.current = raf as unknown as number;
        }, 30);
        finalSwitchTimeoutRef.current = t1;
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (widthAnimTimeoutRef.current)
                window.clearTimeout(widthAnimTimeoutRef.current);
            if (finalSwitchTimeoutRef.current)
                window.clearTimeout(finalSwitchTimeoutRef.current);
            if (exitInitialTimeoutRef.current)
                window.clearTimeout(exitInitialTimeoutRef.current);
            if (exitShrinkTimeoutRef.current)
                window.clearTimeout(exitShrinkTimeoutRef.current);
        };
    }, []);

    if (isFullScreen && !exitingFull) {
        return (
            <FullScreenView
                onSetState={(next) => {
                    if (next === "expanded") {
                        startExitFullScreen();
                    } else {
                        setState(next);
                    }
                }}
                properties={properties}
                loading={loading}
            />
        );
    }

    return (
        <aside
            className={`group relative flex flex-col bg-gray-100 border-r border-gray-200 h-full ${containerWidthClass} transition-all motion-safe:duration-300 motion-safe:ease-in-out motion-reduce:transition-none ${
                animatingToFull || exitingFull ? "z-[1100]" : ""
            }`}
            aria-label="Sidebar"
        >
            <div className="flex items-center justify-between p-3">
                {state === "expanded" && (
                    <h2 className="text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none duration-200">
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
                    className="ml-auto p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors motion-reduce:transition-none"
                >
                    <span aria-hidden="true">
                        {state === "collapsed" ? ">" : "<"}
                    </span>
                </button>
            </div>
            <div className="flex-1 overflow-hidden">
                <div
                    className={`h-full px-3 pb-4 flex flex-col gap-3 text-sm ${
                        state === "expanded"
                            ? "opacity-100 translate-x-0"
                            : "opacity-0 -translate-x-2 pointer-events-none"
                    } transition-all motion-safe:duration-300 motion-safe:ease-in-out motion-reduce:transition-none`}
                >
                    <button
                        onClick={startFullScreenTransition}
                        className="w-full text-left px-2 py-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors motion-reduce:transition-none"
                        aria-label="Open properties in full screen"
                    >
                        Full Screen View
                    </button>
                    <div className="text-gray-500">Property list...</div>
                </div>
                {state === "collapsed" && (
                    <div className="flex flex-col items-center text-xs text-gray-500 select-none">
                        <span className="rotate-90">⋮</span>
                    </div>
                )}
            </div>
        </aside>
    );
}
