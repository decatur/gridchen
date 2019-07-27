import {createView} from "../modules/gridchen/DataViews.js"
import {FullDate, DatePartialTime} from "../modules/gridchen/converter.js"

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
            data = REPR.parse(dataElement.value);
            view = createView(schema, data);
        } catch (e) {
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

export const REPR = {};

REPR.parse = function(s) {
    return eval(s)
};

REPR.stringify = function(v, depth) {
    depth = depth || 0;
    const prefix = Array.from({length: depth}, ()=>'  ').join('');
    const out = [prefix];
    if (v == null) {
        out.push('null');
    } else if (v.constructor === String) {
        out.push('"');
        out.push(v);
        out.push('"');
    } else if (v.constructor === FullDate) {
        out.push(`new FullDate(${v.getUTCFullYear()}, ${v.getUTCMonth()}, ${v.getUTCDate()})`);
    } else if (v.constructor === DatePartialTime) {
        out.push(`new DatePartialTime(${v.getUTCFullYear()}, ${v.getUTCMonth()}, ${v.getUTCDate()}, ${v.getUTCHours()}, ${v.getUTCMinutes()})`);
    } else if (v.constructor === Date) {
        out.push('new Date("' + v.toISOString().replace(':00.000Z', 'Z') + '")');
    } else if (Array.isArray(v)) {
        out.push('[\n');
        const a = [];
        for (const value of v) {
            a.push(REPR.stringify(value, depth+1));
        }
        out.push(a.join(',\n'));
        out.push('\n');
        out.push(prefix);
        out.push(']');
    } else if (typeof v === 'object') {
        out.push('{');
        for (const [key, value] of Object.entries(v)) {
            out.push(key);
            out.push(': ');
            out.push(REPR.stringify(value, depth+1));
            out.push(',');
        }
        out.push('}');
    } else {
        out.push(v);
    }
    return out.join('')
};
