export enum FieldType {
    TEXT = "text",
    NUMBER = "number",
    BOOLEAN = "boolean",
    DATE = "date",
    URL = "url",
    IMAGE = "image",
}

export interface Field {
    id: number;
    name: string;
    type: FieldType;
    defaultValue: string;
    isRequired: boolean;
}

export interface PropertyField extends Field {
    value: any;
}

export interface Property {
    id: number;
    fields: PropertyField[];
}
