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

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const properties = await getProperties();
    const property = properties.find((p) => p.id === parseInt(params.id));
    if (!property) {
        return NextResponse.json(
            { message: "Property not found" },
            { status: 404 }
        );
    }
    return NextResponse.json(property);
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const updatedProperty: RawProperty = await request.json();
    let properties = await getProperties();
    const index = properties.findIndex((p) => p.id === parseInt(params.id));
    if (index === -1) {
        return NextResponse.json(
            { message: "Property not found" },
            { status: 404 }
        );
    }
    properties[index] = {
        ...properties[index],
        ...updatedProperty,
        toProperty: properties[index].toProperty, // preserve the method
    };
    await saveProperties(properties);
    return NextResponse.json(properties[index]);
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    let properties = await getProperties();
    const filteredProperties = properties.filter(
        (p) => p.id !== parseInt(params.id)
    );
    if (properties.length === filteredProperties.length) {
        return NextResponse.json(
            { message: "Property not found" },
            { status: 404 }
        );
    }
    await saveProperties(filteredProperties);
    return NextResponse.json({ message: "Property deleted" });
}
