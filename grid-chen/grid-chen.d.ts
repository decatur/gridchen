declare module GridChen {

    export interface StringConverter {
        fromString: (a: string) => (number | Date | string | boolean);
        toTSV: (a: (number | Date | string | boolean)) => string;
        toEditable: (a: (number | Date | string | boolean)) => string;
        render: (element: HTMLElement, value: any) => undefined;
    }

    export interface IColumnSchema {
        type: string;
        format?: string;
        title: string;
        width: number;
        fractionDigits?: number;
        sortDirection?: number;
        converter?: StringConverter;
        frequency?: String;
        enum?: (string|number)[];
        readOnly?: boolean;
    }

    export interface IGridSchema {
        title: string;
        columnSchemas: IColumnSchema[];
        ids: string[];
        readOnly?: boolean;
    }

    export interface JSONSchema {
        title: string;
        type?: string;
        properties?: Object;
        items?: Object | Object[];
        readOnly?: boolean;
    }

    export interface Range {
        rowIndex: number;
        columnIndex: number;
        rowCount: number;
        columnCount: number;
        // Selects this range.
        select: () => undefined;
        // Returns the live values of the range as an array of rows.
        values: () => any[][];
    }

    export interface MatrixView {
        schema: IGridSchema;
        columnCount: () => number;
        rowCount: () => number;
        removeModel: () => object[];
        deleteRow: (rowIndex: number) => object[];
        getCell: (rowIndex: number, colIndex: number) => any;
        getRow: (rowIndex: number) => any;
        getColumn: (colIndex: number) => any;
        setCell: (rowIndex: number, colIndex: number, value: any) => object[];
        splice: (rowIndex: number) => object[];
        sort: (colIndex: number) => number;
    }

    export interface Interval {
        min: number;
        sup: number;
    }

    export interface LocalDateParser {
        fullDate: (s: string) => number[] | SyntaxError;
        datePartialTime: (s: string) => number[] | SyntaxError;
        dateTime: (s: string) => number[] | SyntaxError;
    }
}