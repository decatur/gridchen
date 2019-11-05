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

    export interface Selection extends Range {
        active: Range;
        pilot: Range;
        areas: Range[];
        headerSelected: boolean;
        grid: GridSelectionAbstraction;
        lastEvt: KeyboardEvent;
        show: () => void;
        hide: () => void;
        move: (rowIncrement: number, columnIncrement: number, doExpand?: boolean) => void;
        setRange: (rowIndex: number, columnIndex: number, rowCount: number, columnCount: number) => void;
        startSelection: (evt: MouseEvent, cellParent: HTMLElement, rowHeight: number, colCount: number,
                         columnEnds: number[], firstRow: number) => void;

    }

    export interface GridSelectionAbstraction {
        colCount: number;
        rowCount: number;
        pageIncrement: number;
        container: HTMLElement;
        scrollIntoView: (rowIndex: number, rowIncrement: number) => void;
        repaintActiveCell: (active: Range) => void;
    }
}