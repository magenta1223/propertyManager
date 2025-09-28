import { NextResponse } from "next/server";
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

export async function GET() {
    const fields = await getFields();
    // Ensure stable ordering (ascending by order then id)
    const sorted = [...fields].sort((a, b) => {
        const ao = a.order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.order ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return a.id - b.id;
    });
    return NextResponse.json(sorted);
}

export async function POST(request: Request) {
    const newField: Field = await request.json();
    const fields = await getFields();
    newField.id =
        fields.length > 0 ? Math.max(...fields.map((f) => f.id)) + 1 : 1;
    // Assign order if missing: next available sequential
    if (newField.order === undefined) {
        const maxOrder = fields.reduce(
            (max, f) =>
                f.order !== undefined && f.order > max ? f.order : max,
            -1
        );
        newField.order = maxOrder + 1;
    }
    fields.push(newField);
    await saveFields(fields);
    return NextResponse.json(newField, { status: 201 });
}
