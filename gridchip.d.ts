declare module Bantam {
    export interface ISelection {
        readonly min: {rowIndex: number, colIndex: number};
        readonly max: {rowIndex: number, colIndex: number};
    }

    export interface ISchema {
        type: string,
        title: string,
        width: number,
        fractionDigits?: number,
        sort?: number
    }

    export interface IPosition {
        rowIndex: number,
        colIndex: number
    }

    /**
     * Right open interval.
     */
    export interface IInterval {
        min: number
        sup: number
    }
}
