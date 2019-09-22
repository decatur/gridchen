import {createView} from "./grid-chen/DataViews.js"
import {FullDate, FullDateConverter, DatePartialTime, DatePartialTimeConverter} from "./grid-chen/converter.js"

export function createInteractiveDemoGrid(container, schema, data) {
    function html(html) {
        container.innerHTML = html;
    }

    html`
    <label>
        Edit JSON Schema
        <textarea class="schema"></textarea>
    </label>
    <label>
        Edit JavaScript Matrix
        <textarea class="data"></textarea>
    </label>
    <label class="grid">
        Grid
        <grid-chen></grid-chen>
    </label>
    <label class="patch">
        JSON Patch <button>Clear</button>
        <textarea readonly></textarea>
    </label>`;

    const schemaElement = container.querySelector('.schema');
    const dataElement = container.querySelector('.data');
    const patchElement = document.querySelector('.patch textarea');
    const gridElement = container.querySelector('grid-chen');
    let view;

    document.querySelector('.patch button').onclick = () => patchElement.value = '';

    function dataChanged(patch) {
        dataElement.value = REPR.stringify(view.getModel(), null, 2);
        patchElement.value = REPR.stringify(patch, null, 2);
    }

    function resetHandler() {

        function newView() {
            try {
                schema = JSON.parse(schemaElement.value);
            } catch (e) {
                e.message = 'Error in JSON Schema: ' + e.message;
                return e;
            }

            data = null;
            view = null;

            try {
                data = REPR.parse(dataElement.value);
            } catch (e) {
                e.message = 'Error in JavaScript Data: ' + e.message;
                return e;
            }

            return createView(schema, data);
        }

        patchElement.value = '';
        view = newView();
        gridElement.resetFromView(view);
    }

    schemaElement.value = JSON.stringify(schema, null, 4);
    dataElement.oninput = schemaElement.oninput = resetHandler;
    gridElement.setEventListener('dataChanged', dataChanged);
    dataElement.value = REPR.stringify(data, null, 2);
    resetHandler();
}

const fullDateConverter = new FullDateConverter();
const datePartialTimeConverter = new DatePartialTimeConverter();

/**
 * Same as the global JSON object, but representation is JavaScript, not JSON.
 */
export const REPR = {
    /**
     * Return a JavaScript object from its representation.
     * @param {string} s
     * @returns {*}
     */
    parse(s) {
        s = s.trim();
        if (s === '') return undefined;
        return eval('(' + s + ')')
    },
    /**
     * Return a string containing a printable representation of an object.
     * @param {*} v
     * @param {null} replacer
     * @param {number?} depth
     * @param {number?} level
     * @returns {string}
     */
    stringify(v, replacer, depth, level) {
        level = level || 0;
        depth = depth || 0;
        const nl0 = '\n' + Array.from({length: level * depth}, () => '  ').join('');
        const nl1 = nl0 + Array.from({length: depth}, () => '  ').join('');
        const out = [];
        if (v == null) {
            out.push('null');
        } else if (v.constructor === String) {
            out.push('"');
            out.push(v);
            out.push('"');
        } else if (v.constructor === FullDate) {
            out.push(fullDateConverter.toREPR(v));
        } else if (v.constructor === DatePartialTime) {
            out.push(datePartialTimeConverter.toREPR(v));
        } else if (v.constructor === Date) {
            out.push('new Date("' + v.toISOString().replace(':00.000Z', 'Z') + '")');
        } else if (Array.isArray(v)) {
            out.push('[' + nl1);
            const a = [];
            for (const value of v) {
                a.push(REPR.stringify(value, replacer, depth, level + 1));
            }
            out.push(a.join(',' + nl1));
            out.push(nl0 + ']');
        } else if (typeof v === 'object') {
            out.push('{' + nl1);
            const a = [];
            for (const [key, value] of Object.entries(v)) {
                a.push('"' + key + '": ' + REPR.stringify(value, replacer, depth, level + 1));
            }
            out.push(a.join(',' + nl1));
            out.push(nl0 + '}');
        } else {
            out.push(v);
        }
        return out.join('')
    }
};
