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

    export interface MatrixView {
        schema: any;
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
        plot: () => void;
    }

    export interface IInterval {
        min: number;
        sup: number;
    }
}