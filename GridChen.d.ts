declare module GridChen {
    export interface ISelection {
        readonly min: {rowIndex: number, colIndex: number};
        readonly max: {rowIndex: number, colIndex: number};
    }

    export interface StringConverter {
        fromString: (a: string) => (number | Date | string | boolean);
        toString: (a: (number | Date | string | boolean)) => string;
        toEditable: (a: (number | Date | string | boolean)) => string;
    }

    export interface IColumnSchema {
        type: string;
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
        items: Object | Object[];
    }

    export interface IPosition {
        row: number;
        col: number;
    }

    /**
     * Right open interval.
     */
    export interface IInterval {
        min: number;
        sup: number;
    }

    export interface Range {
        top: number;
        left: number;
        rows: number;
        columns: number;
        select: () => undefined;
        values: () => any[][];
    }

    export interface IRectangle {
        row: IInterval;
        col: IInterval;
    }

    export type onDataChangeCallback = () => null;

    export interface DataView {
        rowCount: () => number;
        deleteRow: (rowIndex: number) => number;
        getCell: (rowIndex: number, colIndex: number) => any;
        setCell: (rowIndex: number, colIndex: number, value: number) => number;
        insertRowBefore: (rowIndex: number) => number;
        sort: (colIndex: number) => number;
        plot: () => void;
    }
}