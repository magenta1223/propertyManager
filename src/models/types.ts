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
    group?: string; // logical grouping label (e.g. 기본정보, 비용, 위치). Default: 'unknown'
}

export interface PropertyField extends Field {
    value: any; // raw stored value
    label?: string; // human readable label (if different from value). For location: label=address, value="x,y"
}

export interface Property {
    id: number;
    fields: PropertyField[];
}

// Shuttle bus stop data structure (separate master data list)
export interface ShuttleStop {
    id: number;
    name: string; // short name (e.g. station name)
    label: string; // display label / description
    coords: { x: number; y: number }; // x: longitude, y: latitude
}
