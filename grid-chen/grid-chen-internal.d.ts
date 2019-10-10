declare module GridChen {

    export interface Converter {
        fromEditable: (a: string) => (number | Date | string | boolean);
        toTSV: (a: (number | Date | string | boolean)) => string;
        toEditable: (a: (number | Date | string | boolean)) => string;
        createElement:() => HTMLElement;
        render: (element: HTMLElement, value: any) => undefined;
    }

    export interface IGridSchema {
        title: string;
        columnSchemas: IColumnSchema[];
        ids: string[];
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