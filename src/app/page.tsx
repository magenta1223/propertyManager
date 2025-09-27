// c:\propertyManager\property_manager\src\app\page.tsx
"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import type { SidebarState } from "@/components/sidebar";
import Map from "@/components/Map";

export default function Home() {
    const [sidebarState, setSidebarState] = useState<SidebarState>("collapsed");

    return (
        <div className="flex h-screen">
            <Sidebar state={sidebarState} setState={setSidebarState} />
            {sidebarState !== "full-screen" && (
                <main className="flex-1 p-4">
                    <h1 className="text-2xl font-bold mb-4">Map View</h1>
                    <div className="w-full h-full bg-gray-200">
                        <Map />
                    </div>
                </main>
            )}
        </div>
    );
}
