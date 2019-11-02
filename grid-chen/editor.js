import {logger} from "./utils.js";

export function createEditor(container, commitCellEdit, selection, schemas, activeCell, lineHeight) {

    function commit() {
        commitCellEdit(editor.getValue().trim());
        editor.hide();
    }

    /**
     * @param {KeyboardEvent} evt
     */
    function keydownHandler(evt) {
        logger.log('editor.onkeydown: ' + evt.code);
        // Clicking editor should invoke default: move caret. It should not delegate to containers action.
        evt.stopPropagation();

        if (evt.code === 'ArrowLeft' && editor.mode === 'input') {
            evt.preventDefault();
            evt.stopPropagation();
            commit();
            selection.move(0, -1);
        } else if (evt.code === 'ArrowRight' && editor.mode === 'input') {
            evt.preventDefault();
            evt.stopPropagation();
            commit();
            selection.move(0, 1);
        } else if (evt.code === 'Enter' && evt.altKey) {
            evt.preventDefault();
            evt.stopPropagation();
            if (editor.input.style.display !== 'none') {
                editor.showTextArea();
                editor.textarea.value += '\n';
            } else {
                editor.textarea.setRangeText('\n', editor.textarea.selectionStart, editor.textarea.selectionEnd, 'end');
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
            if (editor.mode !== 'hidden') {
                commit();
            }

            if (!container.contains(evt.relatedTarget)) {
                container.blur();
                selection.hide();
            }
        }

    class Editor {

        constructor() {
            this.mode = 'hidden';
            /** @type{HTMLInputElement} */
            this.input = document.createElement('input');
            this.input.id = 'editor';
            this.input.style.display = 'none';

            /** @type{HTMLTextAreaElement} */
            this.textarea = document.createElement('textarea');
            this.textarea.id = 'textarea';
            this.textarea.style.display = 'none';

            this.input.addEventListener('keydown', keydownHandler);
            this.textarea.addEventListener('keydown', keydownHandler);

            // Clicking editor should invoke default: move the caret. It should not delegate to ancestors.
            this.input.addEventListener('mousedown', (evt) => evt.stopPropagation());
            this.textarea.addEventListener('mousedown', (evt) => evt.stopPropagation());

            container.appendChild(this.input);
            container.appendChild(this.textarea);
        }

        hide() {
            this.mode = 'hidden';
            this.setValue('');
            if (this.input.style.display !== 'none') {
                this.input.style.display = 'none';
            } else {
                this.textarea.style.display = 'none';
            }
        }

        showInput(top, left, width) {
            const style = this.input.style;
            style.top = top;
            style.left = left;
            style.width = (parseInt(width) + lineHeight) + 'px';  // Account for the resize handle, which is about 20px
            //style.height = innerHeight;
            if (schemas[selection.active.columnIndex].enum) {
                this.input.setAttribute('list', 'enum' + selection.active.columnIndex);
            } else {
                this.input.removeAttribute('list');
            }

            this.input.readOnly = activeCell.isReadOnly();  // Must not use disabled!

            style.display = 'inline-block';
            // focus on input element, which will then receive this keyboard event.
            // Note: focus after display!
            // Note: It is ok to scroll on focus here.
            this.input.focus();
            this.input.addEventListener('blur', blurHandler);
        }

        showTextArea() {
            const style = this.input.style;
            style.display = 'none';
            this.input.removeEventListener('blur', blurHandler);
            this.textarea.style.left = style.left;
            this.textarea.style.top = style.top;
            this.textarea.style.width = style.width;
            this.textarea.style.display = 'inline-block';

            this.textarea.readOnly = activeCell.isReadOnly();  // Must not use disabled!

            this.textarea.value = this.input.value;
            this.textarea.focus();
            this.textarea.addEventListener('blur', blurHandler);
        }

        /**
         * @param {string} value
         */
        setValue(value) {
            if (this.input.style.display !== 'none') {
                this.input.value = value;
                if (value.includes('\n')) {
                    this.showTextArea();
                    this.textarea.value = value;
                }
            } else {
                this.textarea.value = value;
            }
        }

        getValue() {
            if (this.input.style.display !== 'none') {
                return this.input.value;
            } else {
                return this.textarea.value;
            }
        }
    }

    const editor = new Editor();
    return editor;
}