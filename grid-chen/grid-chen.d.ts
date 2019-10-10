declare module GridChen {

    export interface JSONSchema {
        title: string;
        type?: string;
        properties?: Object;
        items?: Object | Object[];
        readOnly?: boolean;
    }

    export interface IColumnSchema {
        type: string;
        format?: string;
        title: string;
        width: number;
        fractionDigits?: number;
        sortDirection?: number;
        converter?: Converter;
        frequency?: String;
        enum?: (string|number)[];
        readOnly?: boolean;
    }

    export interface CellRange {
        rowIndex: number;
        columnIndex: number;
        rowCount: number;
        columnCount: number;
    }

    export interface GridChen extends HTMLDivElement {
        resetFromView: (view: MatrixView) => GridChen;
        getPatch: () => object[];
        resetPatch: () => undefined;
        getActiveRange: () => CellRange;
        getSelectedRange: () => CellRange;
    }

    interface ActiveCellChanged extends Event {
    }

    interface SelectionChanged extends Event {
    }

    export interface DataChangedEventDetail {
        patch: Object[];
    }

    interface DataChangedEvent extends CustomEvent<DataChangedEventDetail> {
    }

    export interface PlotEventDetail {
        graphElement: HTMLElement;
        title: string;
        schemas: IColumnSchema[];
        columns: number[][];
    }

    interface PlotEvent extends CustomEvent<PlotEventDetail> {
    }

    export function createView(schema: JSONSchema, view: any[] | object): MatrixView;

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
}