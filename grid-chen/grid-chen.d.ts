/////////////////////////////
/// grid-chen JavaScript APIs
/////////////////////////////

declare module GridChenNS {

    export interface JSONSchema {
        title: string;
        pathPrefix: string,
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
        frequency?: string;
        enum?: (string|number)[];
        readOnly?: boolean;
    }

    export interface GridSchema {
        pathPrefix: string,
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
    export interface Range {
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
        offset: (rowOffset: number, colOffset: number) => Range;
        intersect: (Range) => Range | void;  // TODO: Do not return void, work with empty.
        clone: () => Range;
    }

    /**
     * The Web Component.
     */
    export interface GridChen extends HTMLElement {
        /**
         * Resets this element based on the specified view.
         * @param view
         */
        resetFromView: (view: MatrixView, transactionManager?: TransactionManager) => GridChen;

        /**
         * Returns the selection as a rectangle.
         */
        readonly selectedRange: Range;

        select: (Range) => void;
    }

    interface SelectionChanged extends Event {
    }

    export interface PlotEventDetail {
        graphElement: HTMLElement;
        title: string;
        schemas: ColumnSchema[];
        columns: number[][];
    }

    interface PlotEvent extends CustomEvent<PlotEventDetail> {
    }

    export interface JSONPatchOperation {
        op: string;
        path: string;
        value?: any;
        oldValue?: any;
    }

    export interface Patch {
        apply: (Patch) => void;
        pathPrefix: string;
        detail: object;
        operations: JSONPatchOperation[];
    }

    export type JSONPatch = JSONPatchOperation[];

    export function createView(schema: JSONSchema, view: any[] | object): MatrixView;

    export interface MatrixView {
        schema: GridSchema;
        getModel: () => object;
        // setModel: (obj) => void;
        columnCount: () => number;
        rowCount: () => number;
        removeModel: () => JSONPatch; // TODO: Return void.
        deleteRow: (rowIndex: number) => JSONPatch;
        getCell: (rowIndex: number, colIndex: number) => any;
        getRow: (rowIndex: number) => any;
        getColumn: (colIndex: number) => any;
        setCell: (rowIndex: number, colIndex: number, value: any) => JSONPatchOperation[];
        splice: (rowIndex: number) => GridChen.JSONPatch;
        sort: (colIndex: number) => number;
        // TODO: Return the patched object as of getModel()?
        applyJSONPatch: (patch: JSONPatch) => void;
        updateHolder: () => Patch;
    }

    export interface Transaction {
        patches: Patch[];
        commit: () => void;
        readonly operations: JSONPatchOperation[]
    }

    export interface TransactionEvent {
        type: string;
        transaction: Transaction;
    }

    export interface TransactionManager {

        addEventListener: (type: string, listener: (evt: TransactionEvent) => void) => void;

        requestTransaction: (func:() => void) => Promise<void>;

        /**
         * @param apply
         */
        openTransaction: () => Transaction;

        undo: () => void;

        redo: () => void;

        /**
         * Clears the accumulated transactions.
         */
        clear: () => void;

        /**
         * Returns a flat patch set according to JSON Patch https://tools.ietf.org/html/rfc6902
         * of all performed transactions.
         */
        readonly patch: JSONPatch;
    }

}