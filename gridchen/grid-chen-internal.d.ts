declare module GridChenNS {

    export interface Interval {
        min: number;
        sup: number;
    }

    export interface LocalDateParser {
        fullDate: (s: string) => {parts?:number[], error?:SyntaxError};
        datePartialTime: (s: string) => {parts?:number[], error?:SyntaxError};
        dateTime: (s: string) => {parts?:number[], error?:SyntaxError};
    }

    export interface Selection extends Range {
        active: Range;
        initial: Range;
        pilot: Range;
        areas: Range[];
        headerSelected: boolean;
        lastEvt: KeyboardEvent;
        show: () => void;
        hide: () => void;
        move: (rowIncrement: number, columnIncrement: number, doExpand?: boolean) => void;
        setRange: (rowIndex: number, columnIndex: number, rowCount: number, columnCount: number) => void;
        startSelection: (evt: MouseEvent, cellParent: HTMLElement, indexMapper: IndexToPixelMapper) => void;
        convexHull: () => void;
        uiRefresher: (area: Range, show: boolean) => void;
        keyDownHandler: (evt: KeyboardEvent) => void;
    }

    export interface IndexToPixelMapper {
        cellIndexToPixelCoords: (rowIndex: number, columnIndex: number) => {clientX: number, clientY: number};
        pixelCoordsToCellIndex: (clientX: number, clientY: number) => {rowIndex: number, columnIndex: number}
    }

    export interface GridSelectionAbstraction {
        colCount: number;
        rowCount: number;
        pageIncrement: number;
        container: HTMLElement;
        scrollIntoView: (rowIndex: number, rowIncrement: number) => void;
        repaintActiveCell: (active: Range) => void;
    }

    export interface PatchNode {
        children: Record<string, PatchNode>;
        items: PatchNode[];
        splices: {op: string, index: number}[];
        op: string;
        value: any;
    }


}

export interface ResizeObserverEntry {
    // Not yet exported by lib.dom.d.ts
}