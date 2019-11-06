/**
 * Plotly interface to plotting.
 * Dependencies:
 *  You have to bring in Plotly, for example by adding
 *      <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
 *  to the head element.
 */

/**
 * @param {HTMLElement} container
 * @param {string} title
 * @param {GridChenNS.ColumnSchema[]} schemas
 * @param {number[][]} series
 */
export function renderPlot(container, title, schemas, series) {
    /*
    */

    if (!window.Plotly) {
        container.textContent = '🤮 You must add plotly_wrapper.js to your html page';
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
            line: {shape: 'linear'}, // "linear" | "spline" | "hv" | "vh" | "hvh" | "vhv"
            marker: {size: 3}
        })
    }

    Plotly.newPlot(container, traces, layout);
}
