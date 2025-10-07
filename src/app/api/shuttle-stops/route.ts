import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface ShuttleStop {
    id: number;
    name: string; // short name (e.g. 역 이름)
    label: string; // display label (e.g. 출구 + 상세)
    coords: { x: number; y: number }; // x:lng, y:lat
}

const filePath = path.resolve(process.cwd(), "src/data/shuttleStops.json");

async function readStops(): Promise<ShuttleStop[]> {
    try {
        const raw = await fs.readFile(filePath, "utf-8");
        return JSON.parse(raw);
    } catch (e: any) {
        if (e && e.code === "ENOENT") return [];
        throw e;
    }
}

async function writeStops(stops: ShuttleStop[]) {
    await fs.writeFile(filePath, JSON.stringify(stops, null, 2));
}

export async function GET() {
    const stops = await readStops();
    return NextResponse.json(stops);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (!body || typeof body !== "object") {
            return NextResponse.json(
                { message: "Invalid body" },
                { status: 400 }
            );
        }
        const { name, label, coords } = body as Partial<ShuttleStop>;
        if (
            !name ||
            !label ||
            !coords ||
            typeof coords.x !== "number" ||
            typeof coords.y !== "number"
        ) {
            return NextResponse.json(
                { message: "name, label, coords.x, coords.y required" },
                { status: 400 }
            );
        }
        const stops = await readStops();
        const id = stops.length ? Math.max(...stops.map((s) => s.id)) + 1 : 1;
        const newStop: ShuttleStop = {
            id,
            name,
            label,
            coords: { x: coords.x, y: coords.y },
        };
        stops.push(newStop);
        await writeStops(stops);
        return NextResponse.json(newStop, { status: 201 });
    } catch (e: any) {
        return NextResponse.json(
            { message: e.message || "Server error" },
            { status: 500 }
        );
    }
}
