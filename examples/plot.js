/**
 * Alt+F1: creates an modal chart of the data.
 */

const Plotly = window.Plotly;

const dialog = document.createElement('dialog');
dialog.style.width = '80%';
dialog.innerHTML = '<form method="dialog"><button type="submit">Hide</button></form>';
const graphElement = document.createElement('div');
dialog.appendChild(graphElement);
document.body.appendChild(dialog);

export function renderPlot(schema, rowMatrix) {
    /*
    */

    if (!Plotly) return;

    const schemas = schema.columnSchemas;
    const layout = {
        title: schema.title
    };
    let xData;
    const traces = [];

    schemas.forEach(function (schema, index) {
        if (schema.type.startsWith('date')) {
            xData = rowMatrix.map(row => row[index]);
            layout.xaxis = {
                title: schema.title,
            }
        }
    });

    if (!xData) return;

    schemas.forEach(function (schema, index) {
        if (schema.type === 'number' || schema.type === 'integer') {
            traces.push({
                name: schema.title,
                x: xData,
                y: rowMatrix.map(row => row[index]),
                line: {shape: 'hv'},
                marker: {size: 3}
            })
        }
    });

    dialog.showModal();
    Plotly.newPlot(graphElement, traces, layout);
}
