declare module GridChen {

    // export interface Selection {
    //     areas: Range[];
    //     active: Range;
    //     setRange: (rowIndex: number, columnIndex: number, rowCount: number, columnCount: number) => void;
    // }

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