# About
Very lightweight and fast editable web grid with strict MS-Excel adherence to user experience.
Very modern (web components, es6 modules) with no dependencies.
Non-fancy but enterprise capable.

# Usage

```HTML
<!DOCTYPE html>
<bantam-grid id="mybantam" style="height:200px;"></bantam-grid>

<script type="module">
    import {} from "./modules/gridchip.js"
    const schemas = [{title: 'A', width: 150, type: 'date'},  {title: 'B', width: 100, type: 'number'}];
    const dataMatrix = [[new Date(), 1], [new Date(), 2], [new Date(), 3]];
    document.getElementById('mybantam').resetFromMatrix(schemas, dataMatrix);
</script>
```

# Demo

github.io ...

# Issues

* Scrolling past first row must not be possible
* Refresh sort info in header
* It should not be possible to activate or select in multiple grids (-> onblur()).
* On expand selection with Shift-Click, then clicked cell must not become active.

# TODO

* Support string, datetime-local, numeric, boolean and enum
* Show 1 empty row at end (Slider issue)
* Mark overflows, see https://stackoverflow.com/questions/9333379/check-if-an-elements-content-is-overflowing.
  Offer tool tips
* Avoid refreshing complete viewport on cell change
* Use onkeypress for text entry.
* document.activeElement
* Write more unit tests
* Only instantiate Selection once?
* Test in Firefox
* Zoom?

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
es6 (modules, etc). No Typescript to keep it simple.

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

## Event-Layout

Tab navigation is done explicitly by our code, not by the default behavior.
TODO: Check if this is possible by setting tabIndex on span elements.

Watch for multiple actions, for example onclick -> onclick -> ondblclick or onmousedown -> onclick. 

## Browser Support
Chrome

# Test Plan

Open http://localhost:63342/bantam/bantam.html
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

## Multiple Grids
Check only one grid can have focused cell and selection.
Copy from one grid and paste to other.
Scroll both grids.
Edit both grids.

