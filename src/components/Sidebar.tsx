"use client";

import { useState, useEffect } from "react";
import { Property } from "@/models/types";

export type SidebarState = "collapsed" | "expanded" | "full-screen";

interface SidebarProps {
    state: SidebarState;
    setState: React.Dispatch<React.SetStateAction<SidebarState>>;
}

export default function Sidebar({ state, setState }: SidebarProps) {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (state === "full-screen") {
            setLoading(true);
            fetch("/api/properties")
                .then((res) => res.json())
                .then((data) => {
                    setProperties(data);
                    setLoading(false);
                })
                .catch(() => {
                    setLoading(false);
                    // Handle error appropriately
                });
        }
    }, [state]);

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
            <div className="fixed inset-0 bg-white z-50 p-4 overflow-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Properties</h2>
                    <button
                        onClick={() => setState("expanded")}
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
