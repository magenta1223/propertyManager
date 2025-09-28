export enum FieldType {
    TEXT = "text",
    NUMBER = "number",
    BOOLEAN = "boolean",
    DATE = "date",
    URL = "url",
    IMAGE = "image",
    LOCATION = "location",
}

export interface Field {
    id: number;
    name: string;
    type: FieldType;
    defaultValue: string;
    isRequired: boolean;
    order?: number; // ordering index (ascending)
    unit?: string; // optional unit string to append when displaying (e.g. 억 원, m²)
}

export interface PropertyField extends Field {
    value: any; // raw stored value
    label?: string; // human readable label (if different from value). For location: label=address, value="x,y"
}

export interface Property {
    id: number;
    fields: PropertyField[];
}
