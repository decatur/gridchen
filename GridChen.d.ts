declare module GridChen {
    export interface ISelection {
        readonly min: {rowIndex: number, colIndex: number};
        readonly max: {rowIndex: number, colIndex: number};
    }

    export interface StringConverter {
        fromString: (a: string) => (number | Date | string | boolean);
        toString: (a: (number | Date | string | boolean)) => string;
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

    export interface IRectangle {
        row: IInterval;
        col: IInterval;
    }

    export type onDataChangeCallback = () => null;

    export interface DataView {
        rowCount: () => number;
        getRows: (firstRow: number, lastRow: number) => number[][];
        deleteRow: (rowIndex: number) => number;
        setCell: (rowIndex: number, colIndex: number, value: number) => number;
        insertRowBefore: (rowIndex: number) => number;
        copy: (selection: IRectangle, sep: string) => string;
        paste: (topRowIndex: number, topColIndex: number, matrix: number[][]) => number;
        sort: (colIndex: number) => number;
        plot: () => void;
    }
}
