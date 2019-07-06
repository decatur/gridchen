import {createView} from "../modules/DataViews.js"

export function createInteractiveDemoGrid(container, schema, data) {
    const schemaElement = container.querySelector('.schema');
    const dataElement = container.querySelector('.data');
    const gridElement = container.querySelector('grid-chen');

    function dataChanged() {
        dataElement.value = JSON.stringify(data, null, 4);
    }

    function resetHandler() {
        let view;
        try {
            schema = JSON.parse(schemaElement.value);
            data = JSON.parse(dataElement.value);
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