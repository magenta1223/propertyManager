import { NextRequest, NextResponse } from "next/server";

// Simple mock geocoder: hashes the query into pseudo coordinates near Seoul.
// In production, replace with a real geocoding service (e.g., Naver, Kakao, Google)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) {
        return NextResponse.json(
            { error: "Missing query param 'q'" },
            { status: 400 }
        );
    }
    // Very naive hash to floats
    let hash = 0;
    for (let i = 0; i < q.length; i++) {
        hash = (hash * 31 + q.charCodeAt(i)) >>> 0;
    }
    const baseLat = 37.5665; // Seoul
    const baseLng = 126.978;
    const latOffset = (hash % 1000) / 100000; // ~ +/- 0.01
    const lngOffset = ((hash / 1000) % 1000) / 100000;
    const lat = parseFloat((baseLat + latOffset).toFixed(6));
    const lng = parseFloat((baseLng + lngOffset).toFixed(6));
    return NextResponse.json({ lat, lng, address: q });
}
