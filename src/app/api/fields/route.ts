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
    return NextResponse.json(fields);
}

export async function POST(request: Request) {
    const newField: Field = await request.json();
    const fields = await getFields();
    newField.id =
        fields.length > 0 ? Math.max(...fields.map((f) => f.id)) + 1 : 1;
    fields.push(newField);
    await saveFields(fields);
    return NextResponse.json(newField, { status: 201 });
}
