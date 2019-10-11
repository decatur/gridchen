declare module GridChen {

    export interface Range extends CellRange {
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