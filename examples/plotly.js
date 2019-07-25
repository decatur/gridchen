/**
 * Alt+F1: creates an modal chart of the data.
 */



/**
 * @param {HTMLElement} container
 * @param {string} title
 * @param {Array<GridChen.IColumnSchema>} schemas
 * @param {Array<Array<number>>} series
 */
export function renderPlot(container, title, schemas, series) {
    /*
    */

    if (!window.Plotly) {
        container.textContent = '🤮 You must add plotly.js to your html page';
    }

    const layout = {
        title: title,
        xaxis: {
            title: schemas[0].title,
        }
    };

    const traces = [];

    for (let i=1; i<series.length; i++) {
        traces.push({
            name: schemas[i].title,
            x: series[0],
            y: series[i],
            line: {shape: 'hv'},
            marker: {size: 3}
        })
    }

    Plotly.newPlot(container, traces, layout);
}
