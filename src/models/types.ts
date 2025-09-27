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

export class Property {
    id: number;
    fields: PropertyField[];

    constructor(id: number, fields: PropertyField[]) {
        this.id = id;
        this.fields = fields;
    }

    toRawProperty(): RawProperty {
        return new RawProperty(this.id, JSON.stringify(this.fields));
    }
}

export class RawProperty {
    id: number;
    fields: string;

    constructor(id: number, fields: string) {
        this.id = id;
        this.fields = fields;
    }

    toProperty(): Property {
        return new Property(this.id, JSON.parse(this.fields));
    }
}
