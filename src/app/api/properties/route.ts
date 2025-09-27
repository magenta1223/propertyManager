import { NextResponse } from "next/server";
import { RawProperty } from "@/models/types";
import fs from "fs/promises";
import path from "path";

const propertiesFilePath = path.resolve(
    process.cwd(),
    "src/data/properties.json"
);

async function getProperties(): Promise<RawProperty[]> {
    try {
        const data = await fs.readFile(propertiesFilePath, "utf-8");
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

async function saveProperties(properties: RawProperty[]) {
    await fs.writeFile(propertiesFilePath, JSON.stringify(properties, null, 2));
}

export async function GET() {
    const properties = await getProperties();
    return NextResponse.json(properties);
}

export async function POST(request: Request) {
    const newProperty: RawProperty = await request.json();
    const properties = await getProperties();
    newProperty.id =
        properties.length > 0
            ? Math.max(...properties.map((p) => p.id)) + 1
            : 1;
    properties.push(newProperty);
    await saveProperties(properties);
    return NextResponse.json(newProperty, { status: 201 });
}
