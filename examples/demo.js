import {createView} from "../modules/gridchen/DataViews.js"
import {FullDate, FullDateConverter, DatePartialTime, DatePartialTimeConverter} from "../modules/gridchen/converter.js"

export function createInteractiveDemoGrid(container, schema, data) {
    const schemaElement = container.querySelector('.schema');
    const dataElement = container.querySelector('.data');
    const gridElement = container.querySelector('grid-chen');

    function dataChanged(patch) {
        dataElement.value = REPR.stringify(data, null, 2);
        container.querySelector('.patch').textContent = REPR.stringify(patch, null, 2);
    }

    function resetHandler() {
        let view;
        try {
            schema = JSON.parse(schemaElement.value);
            data = null;
            try {
                data = REPR.parse(dataElement.value);
            } catch (e) {
                e.message = 'Error in JavaScript Data: ' + e.message;
                view = e;
            }
            if (data != null) {
                view = createView(schema, data);
            }
        } catch (e) {
            e.message = 'Error in JSON Schema: ' + e.message;
            view = e;
        }
        gridElement.resetFromView(view)
    }

    container.querySelector('h2').textContent = schema.title;
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
        return eval('(' + s + ')')
    },
    /**
     * Return a string containing a printable representation of an object.
     * @param {*} v
     * @param {null} replacer
     * @param {number} depth
     * @returns {string}
     */
    stringify(v, replacer, depth, level) {
        level = level || 0;
        depth = depth || 0;
        const nl0 = '\n' + Array.from({length: level*depth}, () => '  ').join('');
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
                a.push(key + ': ' + REPR.stringify(value, replacer, depth, level + 1));
            }
            out.push(a.join(',' + nl1));
            out.push(nl0 + '}');
        } else {
            out.push(v);
        }
        return out.join('')
    }
};
