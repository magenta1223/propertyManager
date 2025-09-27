// c:\propertyManager\property_manager\src\app\page.tsx
"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import type { SidebarState } from "@/components/Sidebar";
import Map from "@/components/Map";

export default function Home() {
    const [sidebarState, setSidebarState] = useState<SidebarState>("collapsed");

    return (
        <div className="relative flex h-screen overflow-hidden">
            {/* Sidebar (collapsed / expanded) occupies normal flow. Full-screen state will overlay using fixed positioning inside component itself */}
            <Sidebar state={sidebarState} setState={setSidebarState} />
            {/* Always render main content so full-screen sidebar overlays instead of replacing */}

            <main className="flex-1 p-4">
                <h1 className="text-2xl font-bold mb-4">Map View</h1>
                <div
                    className={`w-full h-full bg-gray-200 transition-[filter] duration-200 ${
                        sidebarState === "full-screen"
                            ? "pointer-events-none"
                            : ""
                    }`}
                >
                    <Map />
                </div>
            </main>
        </div>
    );
}
