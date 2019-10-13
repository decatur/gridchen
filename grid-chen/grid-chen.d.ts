/////////////////////////////
/// grid-chen APIs
/////////////////////////////

declare module GridChen {

    export interface JSONSchema {
        title: string;
        type: string;
        /**
         * If properties is set, this schema describes an object.
         */
        properties?: Object;
        /**
         * If items is an array object, this schema describes a fixed length tuple
         * with item at index having schema items[index].
         * If items is an object, this schema describes a variable length array
         * with each item having the object as its schema.
         */
        items?: Object | Object[];
        readOnly?: boolean;
    }

    export interface ColumnSchema {
        readonly type: string;
        format?: string;
        title: string;
        width: number;
        fractionDigits?: number;
        sortDirection?: number;
        converter?: Converter;
        // TODO: Rename according ISO
        frequency?: String;
        enum?: (string|number)[];
        readOnly?: boolean;
    }

    export interface GridSchema {
        title: string;
        columnSchemas: ColumnSchema[];
        ids: string[];
        readOnly?: boolean;
    }

    export interface Converter {
        fromEditable: (a: string) => (number | Date | string | boolean);
        toTSV: (a: (number | Date | string | boolean)) => string;
        toEditable: (a: (number | Date | string | boolean)) => string;
        createElement:() => HTMLElement;
        render: (element: HTMLElement, value: any) => void;
    }

    /**
     * A rectangular range of grid cells.
     */
    export interface CellRange {
        /**
         * Returns the lowest row index in the range.
         */
        rowIndex: number;
        /**
         * Returns the lowest column index in the range.
         */
        columnIndex: number;
        rowCount: number;
        columnCount: number;
    }

    /**
     * The Web Component.
     */
    export interface GridChen extends HTMLElement {
        /**
         * Resets this element based on the specified view.
         * @param view
         */
        resetFromView: (view: MatrixView) => GridChen;
        /**
         * The accumulated JSON Patch since the last resetFromView() or resetPatch().
         */
        readonly patch: object[];
        /**
         * Returns the active cell.
         */
        readonly activeRange: CellRange;
        /**
         * Returns the convex hull of all selected areas.
         * This always contains the active cell.
         */
        readonly selectedRange: CellRange;
        /**
         * Empties the accumulated JSON Patch.
         */
        resetPatch: () => void;
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
        schemas: ColumnSchema[];
        columns: number[][];
    }

    interface PlotEvent extends CustomEvent<PlotEventDetail> {
    }

    export function createView(schema: JSONSchema, view: any[] | object): MatrixView;

    export interface MatrixView {
        schema: GridSchema;
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
        /**
         * Undoes one transaction patch if possible and pops it from the list.
         * @param transactionPatches list of list of patch operations
         */
        undo: (transactionPatches: object[][]) => void;
    }

    export interface JSONPatchOperation {
        op: string;
        path: string;
        value?: any;
        oldValue?: any;
    }

    export type JSONPatch = JSONPatchOperation[];
}