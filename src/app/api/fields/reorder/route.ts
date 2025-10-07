import { NextResponse, NextRequest } from "next/server";
import { Field } from "@/models/types";
import fs from "fs/promises";
import path from "path";

const fieldsFilePath = path.resolve(process.cwd(), "src/data/fields.json");

async function getFields(): Promise<Field[]> {
    try {
        const data = await fs.readFile(fieldsFilePath, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as any).code === "ENOENT"
        ) {
            return [];
        }
        throw error;
    }
}

async function saveFields(fields: Field[]) {
    await fs.writeFile(fieldsFilePath, JSON.stringify(fields, null, 2));
}

/**
 * POST /api/fields/reorder
 * Body: { orderedIds: number[] }
 * Reassigns sequential order values based on the provided id sequence.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const orderedIds: number[] = body.orderedIds;
        if (!Array.isArray(orderedIds)) {
            return NextResponse.json(
                { message: "orderedIds must be an array" },
                { status: 400 }
            );
        }
        const fields = await getFields();
        const fieldMap = new Map(fields.map((f) => [f.id, f] as const));
        // Validate all ids exist
        for (const id of orderedIds) {
            if (!fieldMap.has(id)) {
                return NextResponse.json(
                    { message: `Field id ${id} not found` },
                    { status: 404 }
                );
            }
        }
        // Apply new order: index in array
        orderedIds.forEach((id, idx) => {
            const f = fieldMap.get(id)!;
            f.order = idx;
        });
        // Persist
        await saveFields(fields);
        // Return sorted snapshot
        const sorted = [...fields].sort((a, b) => a.order! - b.order!);
        return NextResponse.json(sorted, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { message: e?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
