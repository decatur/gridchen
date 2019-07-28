import {createView} from "../modules/gridchen/DataViews.js"
import {FullDate, FullDateConverter, DatePartialTime, DatePartialTimeConverter} from "../modules/gridchen/converter.js"

export function createInteractiveDemoGrid(container, schema, data) {
    const schemaElement = container.querySelector('.schema');
    const dataElement = container.querySelector('.data');
    const gridElement = container.querySelector('grid-chen');

    function dataChanged() {
        dataElement.value = REPR.stringify(data, null, 4);
    }

    function resetHandler() {
        let view;
        try {
            schema = JSON.parse(schemaElement.value);
            try {
                data = REPR.parse(dataElement.value);
                view = createView(schema, data);
            } catch (e) {
                e.message = 'Error in JavaScript Data: ' + e.message;
                view = e;
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
    dataChanged();
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
        return eval(s)
    },
    /**
     * Return a string containing a printable representation of an object.
     * @param {*} v
     * @param {number} depth
     * @returns {string}
     */
    stringify(v, depth) {
        depth = depth || 0;
        const prefix = Array.from({length: depth}, () => '  ').join('');
        const out = [prefix];
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
            out.push('[\n');
            const a = [];
            for (const value of v) {
                a.push(REPR.stringify(value, depth + 1));
            }
            out.push(a.join(',\n'));
            out.push('\n');
            out.push(prefix);
            out.push(']');
        } else if (typeof v === 'object') {
            out.push('{\n');
            const a = [];
            for (const [key, value] of Object.entries(v)) {
                a.push(key);
                a.push(': ');
                a.push(REPR.stringify(value, depth + 1));
                a.push(',');
            }
            out.push(a.join(',\n'));
            out.push('\n');
            out.push(prefix);
            out.push('}');
        } else {
            out.push(v);
        }
        return out.join('')
    }
};
