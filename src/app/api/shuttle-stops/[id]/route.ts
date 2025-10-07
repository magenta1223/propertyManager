import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface ShuttleStop {
    id: number;
    name: string;
    label: string;
    coords: { x: number; y: number };
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

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const id = Number(params.id);
    const stops = await readStops();
    const found = stops.find((s) => s.id === id);
    if (!found)
        return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(found);
}

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    const id = Number(params.id);
    const partial = await req.json();
    const stops = await readStops();
    const idx = stops.findIndex((s) => s.id === id);
    if (idx === -1)
        return NextResponse.json({ message: "Not found" }, { status: 404 });
    const current = stops[idx];
    const updated: ShuttleStop = {
        ...current,
        name:
            typeof partial.name === "string" && partial.name.trim()
                ? partial.name
                : current.name,
        label:
            typeof partial.label === "string" && partial.label.trim()
                ? partial.label
                : current.label,
        coords:
            partial.coords &&
            typeof partial.coords.x === "number" &&
            typeof partial.coords.y === "number"
                ? { x: partial.coords.x, y: partial.coords.y }
                : current.coords,
    };
    stops[idx] = updated;
    await writeStops(stops);
    return NextResponse.json(updated);
}

export async function DELETE(
    _: Request,
    { params }: { params: { id: string } }
) {
    const id = Number(params.id);
    const stops = await readStops();
    const filtered = stops.filter((s) => s.id !== id);
    if (filtered.length === stops.length)
        return NextResponse.json({ message: "Not found" }, { status: 404 });
    await writeStops(filtered);
    return NextResponse.json({ message: "Deleted" });
}
