/**
 * Author: Wolfgang Kühn 2019
 * Source located at https://github.com/decatur/grid-chen/grid-chen
 *
 * Module implementing edit and display (for read-only cells) capabilities for cell values.
 */

//@ts-check

import {logger} from "./utils.js";

/**
 * @param {HTMLElement} container
 * @param {function} commitCellEdit
 * @param {GridChenNS.Selection} selection
 * @param {number} lineHeight
 * @returns {Editor}
 */
export function createEditor(container, commitCellEdit, selection, lineHeight) {
    let currentMode = 'hidden';
    let currentSchema = undefined;
    /** @type{boolean} */
    let currentReadOnly;

    /** @type{HTMLInputElement} */
    const input = document.createElement('input');
    input.id = 'editor';
    input.style.display = 'none';

    /** @type{HTMLTextAreaElement} */
    const textarea = document.createElement('textarea');
    textarea.id = 'textarea';
    textarea.style.display = 'none';

    input.addEventListener('keydown', keydownHandler);
    textarea.addEventListener('keydown', keydownHandler);

    // Clicking editor should invoke default: move the caret. It should not delegate to ancestors.
    input.addEventListener('mousedown', (evt) => evt.stopPropagation());
    textarea.addEventListener('mousedown', (evt) => evt.stopPropagation());

    container.appendChild(input);
    container.appendChild(textarea);

    function hide() {
        currentMode = 'hidden';
        setValue('');
        if (input.style.display !== 'none') {
            input.style.display = 'none';
        } else {
            textarea.style.display = 'none';
        }
    }

    function commit() {
        const value = getValue().trim();
        // Very nasty side effect: We need first to hide editor, then call commitCellEdit().
        // The reason is duplicate commits involving JavaScript breakpoints in commitCellEdit() and
        // then triggering blurHandler when pressing the resume button.
        hide();
        commitCellEdit(value);
    }

    function showInput(top, left, width) {
        const style = input.style;
        style.top = top;
        style.left = left;
        style.width = (parseInt(width) + lineHeight) + 'px';  // Account for the resize handle, which is about 20px
        //style.height = innerHeight;
        if (currentSchema.enum) {
            input.setAttribute('list', 'enum' + selection.active.columnIndex);
        } else {
            input.removeAttribute('list');
        }

        input.readOnly = currentReadOnly;  // Must not use disabled!

        style.display = 'inline-block';
        // focus on input element, which will then receive this keyboard event.
        // Note: focus after display!
        // Note: It is ok to scroll on focus here.
        input.focus();
        input.addEventListener('blur', blurHandler);
    }

    function showTextArea() {
        const style = input.style;
        style.display = 'none';
        input.removeEventListener('blur', blurHandler);
        textarea.style.left = style.left;
        textarea.style.top = style.top;
        textarea.style.width = style.width;
        textarea.style.display = 'inline-block';

        textarea.readOnly = currentReadOnly;  // Must not use disabled!

        textarea.value = input.value;
        textarea.focus();
        textarea.addEventListener('blur', blurHandler);
    }

    /**
     * @param {string} value
     */
    function setValue(value) {
        if (input.style.display !== 'none') {
            input.value = value;
            if (value.includes('\n')) {
                showTextArea();
                textarea.value = value;
            }
        } else {
            textarea.value = value;
        }
    }

    function getValue() {
        if (input.style.display !== 'none') {
            return input.value;
        } else {
            return textarea.value;
        }
    }

    /**
     * @param {KeyboardEvent} evt
     */
    function keydownHandler(evt) {
        logger.log('editor.onkeydown: ' + evt.code);
        // Clicking editor should invoke default: move caret. It should not delegate to containers action.
        evt.stopPropagation();

        if (evt.code === 'ArrowLeft' && currentMode === 'input') {
            evt.preventDefault();
            evt.stopPropagation();
            commit();
            selection.move(0, -1);
        } else if (evt.code === 'ArrowRight' && currentMode === 'input') {
            evt.preventDefault();
            evt.stopPropagation();
            commit();
            selection.move(0, 1);
        } else if (evt.code === 'Enter' && evt.altKey) {
            evt.preventDefault();
            evt.stopPropagation();
            if (input.style.display !== 'none') {
                showTextArea();
                textarea.value += '\n';
            } else {
                textarea.setRangeText('\n', textarea.selectionStart, textarea.selectionEnd, 'end');
            }
        } else if (evt.code === 'Enter') {
            evt.preventDefault();
            evt.stopPropagation();
            commit();
            selection.move(evt.shiftKey ? -1 : 1, 0);
        } else if (evt.code === 'Tab') {
            evt.preventDefault();
            evt.stopPropagation();
            commit();
            selection.move(0, evt.shiftKey ? -1 : 1);
        } else if (evt.code === 'Escape') {
            // Leave edit mode.
            evt.preventDefault();
            evt.stopPropagation();
            commit();
        }
    }

    function blurHandler(evt) {
        logger.log('editor.onblur');
        if (currentMode !== 'hidden') {
            commit();
        }

        if (!container.contains(evt.relatedTarget)) {
            container.blur();
            selection.hide();
        }
    }

    /**
     * Stateless and closed class pattern.
     */
    class Editor {
        constructor() {
        }

        get mode() {
            return currentMode
        }

        open(mode, value, spanStyle, schema, readOnly) {
            currentMode = mode;
            currentSchema = schema;
            currentReadOnly = readOnly;
            showInput(spanStyle.top, spanStyle.left, spanStyle.width);
            setValue(value);
        }


        _keyboard(typeArg, eventInitDict) {
            let targetElem;
            if (input.style.display !== 'none') {
                targetElem = input;
            } else if (textarea.style.display !== 'none') {
                targetElem = textarea;
            } else {
                throw new Error('Event send to editor but editor does not show.');
            }
            targetElem.dispatchEvent(new KeyboardEvent(typeArg, eventInitDict));
        }

        _sendKeys(keys) {
            if (input.style.display !== 'none') {
                input.value += keys;
            } else if (textarea.style.display !== 'none') {
                textarea.value += keys;
            } else {
                throw new Error('Send keys to editor but editor does not show.');
            }
        }
    }

    return new Editor();
}