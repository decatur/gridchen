# Alpha-version: Do not use! 

# About
Very lightweight and fast editable web grid with strict MS-Excel adherence to user experience.
Very modern (web components, es6 modules) with no dependencies.

# Usage

```HTML
<!DOCTYPE html>
<grid-chen id="my-grid" style="height:200px;"></grid-chen>

<script type="module">
    import "./modules/GridChen.js"
    import {createRowMatrixView} from "./modules/DataViews.js"

    const schema = {
        title: 'Readme',
        columnSchemas: [
            {title: 'A', width: 150, type: 'date'},
            {title: 'B', width: 100, type: 'number'}
        ]
    };
    const matrix = [[new Date(), 1], [new Date(), 2], [new Date(), 3]];
    document.getElementById('my-grid').resetFromView(createRowMatrixView(schema, matrix));
</script>
```

# Demo

github.io ...

# Issues

* Action 1) Edit cell 2) Click on slider: Active cell does not return to active.
* Paste must select pasted region (pasted region differs from selection if selection cannot be tiled by source)
* Using slider will blur grid.
* Only honour first sortDirection!
* Handling of Infinity and NaN (#NV in de-de)
* Do not prevent zoom via Ctrl-MouseWheel (which is Excel behaviour)?

# TODO

* Support enum via select or datalist
* Show 1 empty row at end (Slider issue)
* Mark overflows, see https://stackoverflow.com/questions/9333379/check-if-an-elements-content-is-overflowing and offer tool tips
* Avoid refreshing complete viewport on cell change
* Use onkeypress for text entry.
* Use document.activeElement instead of activeCell.span?
* Write more unit tests
* Test Firefox


# Alternatives
* [SlickGrid](https://github.com/mleibman/SlickGrid)
* [ag-Grid](https://www.ag-grid.com/)
* [canvas-datagrid](https://github.com/TonyGermaneri/canvas-datagrid)
* [fin-hypergrid](https://github.com/fin-hypergrid/core)

# Expected Behaviour

We try to mimic MSE as close as possible.

## Inactive cell
The content is displayed according the formatter.

## Active Cell
If a cell is clicked, this cell becomes active. There is at most one active cell.

## ACTIVE mode
Initially, the active cell is in ACTIVE mode. The content is displayed according the formatter.

In ACTIVE or and in INPUT mode, we can navigate from that cell to adjoining cells (`ArrowKeys`, `Enter`=`ArrowDown`,
Shift-`Enter`=`ArrowUp`, `Tab`=`ArrowRight`, Shift-`Tab`=`ArrowLeft`),
which in turn become the active cell. Likewise, we can navigate by page (PageKeys). A page has the size of the view port.
Horizontal navigation stops at the first and last column.

The Delete key will delete the active cell content.

## Scroll Navigation
Vertical navigation will trigger a viewport scroll if the active cell would fall of the view port.
During scroll navigation (`Arrow` or `Page`), the active cell is **always** fixed in the viewport.

## INPUT mode
The active cell enters input mode if the cell receives text input.
The `Escape` key has no meaning.

## EDIT mode
Like in INPUT mode, the cell receives text input. However, the ArrowKeys no longer change cells, but move the caret.
The `Delete` key will delete the character after the caret.
The `Enter`, Shift-`Enter`, `Tab` and Shift-`Tab` keys have the same meaning is in INPUT mode, the PageKeys are ignored.
The Escape key will exit EDIT mode and enter ACTIVE mode.

## In INPUT and EDIT mode
* the cell content is displayed as the raw value from the model.
* after navigating away from the cell, the change is pushed to the model.

## Expanding Matrix
Enter data past the last row or use the "Insert Row Above" button.

## Selection
There is at most one selection. The selection always contains the active cell. The selection is always rectangular.
The selection can be expanded to multiple cells by Shift-`LeftClick` another cell. The active cell stays the same.
At no point we tolerate DOM text node selection as it is confusing.
The `Delete` key will delete the selections content.

## Copy&Paste
We support only text/plain as tab-separated values.
Ctrl-`KeyV` pastes the clipboard to cells, tolerating both `\r\n` and `\n` line endings.
Ctrl-`KeyC` copies the selected cells to the clipboard with `\n` line endings.
 
## Model
A rectangular matrix as an array of equally sized rows.
Missing rows are allowed and are indicated by undefined. Missing cell values are indicated by
undefined.

# Design

## Goals
Very lightweight but fast web component with strict MS-Excel adherence to user experience. 
Non-fancy but enterprise capable, time series.

## Language
es7 (modules, promises, async). No Typescript to keep it simple.

Default action (focus, tabbing), CSS 

## DOM-Layout

0. Header row of `HTMLSpanElement`s
1. Absolute positioned NxM-matrix (the viewport) of `HTMLSpanElement`s
2. One HTMLInputElement for text input popping up over active cell.
3. One HTMLInputElement with type=range as scroll bar

Any scroll action (change of viewport offset) will re-render the viewport.
The selection is marked by setting the background-color of the selected span elements.

We use tabIndex to make cellParent focusable and therefore able to receive keyboard events.
This is more safe than contentEditable, where you have to prevent user from directly manipulating the DOM
(for example context menu->insert from clipboard).

### Alternative Layouts
* canvas
    * Cons: Needs much more code for rendering and event handling; Pixel-graphic.
* svg
    * Cons: User input
* HTMLTableElement -> dash datagrid
* HTMLInputElement matrix
    * Cons: Cannot have format mode.
    * Pros: Very HTML-ish
    
### cells: input vs span
input pro:
* semantically correct
* more natural handling of clipboard events
span pro:
* allows rich formatting, for example links
* easier handling of cell modes (FORMAT, EDIT, INPUT)

### editable vs popup input
editable pro
* must not handle display, location and focus of input element
popup input pro
* semantically correct
* no need to safeguard the integrity of the dom (user injects dom fragment via context menu->insert) 

## Event-Layout

Tab navigation is done explicitly by our code, not by the default behavior.
TODO: Check if this is possible by setting tabIndex on span elements.

Watch for multiple actions, for example onclick -> onclick -> ondblclick or onmousedown -> onclick. 

# Browser Support
Tested only with Chrome Version 71.0

# API Design
We use the JavaScript API for Office if possible, for example 
[Excel.Range](https://docs.microsoft.com/en-us/javascript/api/excel/excel.range).

# Test Plan

Open http://localhost:63342/bantam/demo1.html
-> a grid with one header and 1000 data rows is displayed.

Change location hash to rowcount=10
-> a grid with one header and 10 data rows is displayed

Click any cell
-> Cell is active

Type 123`Enter`
-> Cell contains value 123

DoubleClick cell and replace 2 by 4 then `Enter`
-> Cell contains value 143

With mouse-down/move/up select multiple cells 
-> Selection is highlighted

Click any cell
-> Selection is revoked

Scroll active cell out of view, then create input -> active cell scrolls into view.
Note: Currently we only support dblclick to enter edit mode. So it it not possible to enter edit mode on a out of view cell.

Pull mouse-wheel -> scroll down; Push -> scroll up

Mouse-Wheel past the first row -> not possible

Make a Click-Selection-Expand. -> The active cell should not change.

Check trimming

Edit Mode shows raw data

Copy&Paste date must result in same value

Grid looses focus -> no active cell, no selection

Sorting does not change active cell nor selection

Editing active cell when outside viewport is possible. The active cell must scroll into view.
Clicking editor should move caret.
Expanding selection (both mouse and keyboard) must not change active cell.
In EDIT mode, Shift-Enter enters moves active cell up in ACTIVE mode.
Escape must exist edit and input mode
EDIT mode must show the **raw** data, not the formatted value.
On load of the grid, no active cell or selection must show.
Header must show sort direction, if any. Sort must toggle. Only one column must show sort direction.
Bluring grid in EDIT mode must hide row menu, active cell and selection.
Test all date converters

* WheelScroll with selected GridChen must not scroll any surrounding HTML element.
If paste target selection is multiple of source, then tile target with source, otherwise just paste source

## Multiple Grids
Check only one grid can have focused cell and selection.
Copy from one grid and paste to other.
Scroll both grids.
Edit both grids.

