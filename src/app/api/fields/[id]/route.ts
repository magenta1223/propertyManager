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

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const fields = await getFields();
    const field = fields.find((f) => f.id === parseInt(params.id));
    if (!field) {
        return NextResponse.json(
            { message: "Field not found" },
            { status: 404 }
        );
    }
    return NextResponse.json(field);
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const updatedField: Field = await request.json();
    let fields = await getFields();
    const index = fields.findIndex((f) => f.id === parseInt(params.id));
    if (index === -1) {
        return NextResponse.json(
            { message: "Field not found" },
            { status: 404 }
        );
    }
    fields[index] = { ...fields[index], ...updatedField };
    // Persist updated list; client may request reordering by sending order values
    await saveFields(fields);
    return NextResponse.json(fields[index]);
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    let fields = await getFields();
    const filteredFields = fields.filter((f) => f.id !== parseInt(params.id));
    if (fields.length === filteredFields.length) {
        return NextResponse.json(
            { message: "Field not found" },
            { status: 404 }
        );
    }
    await saveFields(filteredFields);
    return NextResponse.json({ message: "Field deleted" });
}
