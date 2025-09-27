"use client";

import { useState, useEffect } from "react";
import { Property } from "@/models/types";
import CollapsedView from "./CollapsedView";
import ExpandedView from "./ExpandedView";
import FullScreenView from "./FullScreenView";

export type SidebarState = "collapsed" | "expanded" | "full-screen";

interface SidebarProps {
    state: SidebarState;
    setState: (state: SidebarState) => void;
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

    switch (state) {
        case "collapsed":
            return <CollapsedView onSetState={setState} />;
        case "expanded":
            return <ExpandedView onSetState={setState} />;
        case "full-screen":
            return (
                <FullScreenView
                    onSetState={setState}
                    properties={properties}
                    loading={loading}
                />
            );
        default:
            return null;
    }
}
