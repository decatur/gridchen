declare module GridChen {

    export interface StringConverter {
        fromString: (a: string) => (number | Date | string | boolean);
        toString: (a: (number | Date | string | boolean)) => string;
        toEditable: (a: (number | Date | string | boolean)) => string;
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
    }

    export interface IGridSchema {
        title: string;
        columnSchemas: IColumnSchema[];
    }

    export interface JSONSchema {
        title: string;
        type?: string;
        properties?: Object;
        items?: Object | Object[];
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

    export interface DataView {
        rowCount: () => number;
        deleteRow: (rowIndex: number) => number;
        getCell: (rowIndex: number, colIndex: number) => any;
        setCell: (rowIndex: number, colIndex: number, value: any) => number;
        insertRowBefore: (rowIndex: number) => number;
        sort: (colIndex: number) => number;
        plot: () => void;
    }
}