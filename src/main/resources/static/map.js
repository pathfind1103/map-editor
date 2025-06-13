const CONFIG = {
    API_URL: 'http://localhost:8080/api/objects',
    DEFAULT_CENTER: [37.6173, 55.7558], // Москва
    DEFAULT_ZOOM: 10,
    GEOMETRY_TYPES: {
        marker: 'Point',
        line: 'LineString',
        polygon: 'Polygon'
    }
};

const styles = {
    Point: new ol.style.Style({
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({ color: 'red' })
        })
    }),
    LineString: new ol.style.Style({
        stroke: new ol.style.Stroke({ color: 'green', width: 2 })
    }),
    Polygon: new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(0, 255, 0, 0.2)' }),
        stroke: new ol.style.Stroke({ color: 'blue', width: 2 })
    }),
    selected: new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
        stroke: new ol.style.Stroke({ color: 'blue', width: 2 }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({ color: 'red' })
        }),
        zIndex: 2001
    })
};

let map, drawInteraction, selectedFeature, drawSource, modifyInteraction, popupCoordinates;

function initMap() {
    drawSource = new ol.source.Vector();
    modifyInteraction = new ol.interaction.Modify({ source: drawSource });

    map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            new ol.layer.Vector({
                source: drawSource,
                style: feature => styles[feature.getGeometry().getType()]
            })
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat(CONFIG.DEFAULT_CENTER),
            zoom: CONFIG.DEFAULT_ZOOM
        })
    });

    map.addInteraction(modifyInteraction);
    map.on('click', handleMapClick);
    modifyInteraction.on('modifyend', (event) => showEditPopup(event.features.getArray()[0]));
    drawSource.on('change', updateObjectList);
    map.getView().on('change', saveState);
    document.getElementById('objectType').addEventListener('change', saveState);
    window.addEventListener('load', loadState);

    loadObjects();
}

async function fetchWithErrorHandling(url, options) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Fetch error at ${url}`, error);
        alert(`Ошибка: ${error.message}`);
        throw error;
    }
}

async function loadObjects() {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.textContent = 'Загрузка...';
    document.getElementById('controls').appendChild(loadingIndicator);
    try {
        const objects = await fetchWithErrorHandling(CONFIG.API_URL);
        drawSource.clear();
        objects.forEach(obj => {
            let geometry;
            try {
                if (obj.type === 'marker') {
                    let coords;
                    if (typeof obj.coordinates === 'object' && 'x' in obj.coordinates && 'y' in obj.coordinates) {
                        coords = [obj.coordinates.x, obj.coordinates.y];
                    } else if (Array.isArray(obj.coordinates) && Array.isArray(obj.coordinates[0])) {
                        coords = obj.coordinates[0]; // [[lon, lat]] -> [lon, lat]
                    } else {
                        throw new Error(`Неподдерживаемый формат координат для маркера: ${JSON.stringify(obj.coordinates)}`);
                    }
                    geometry = new ol.geom.Point(ol.proj.fromLonLat(coords));
                } else if (obj.type === 'line') {
                    geometry = new ol.geom.LineString(obj.coordinates.map(coord => ol.proj.fromLonLat([coord.x, coord.y])));
                } else if (obj.type === 'polygon') {
                    geometry = new ol.geom.Polygon([obj.coordinates.map(coord => ol.proj.fromLonLat([coord.x, coord.y]))]);
                }
                const feature = new ol.Feature({ geometry });
                feature.setProperties({ id: obj.id, name: obj.name, type: obj.type });
                drawSource.addFeature(feature);
            } catch (error) {
                console.error(`Ошибка при обработке объекта ${obj.id}:`, error.message);
            }
        });
    } finally {
        loadingIndicator.remove();
    }
}

function validateInput(input) {
    return input.trim().length > 0;
}

function startDrawing() {
    const name = document.getElementById('objectName').value;
    if (!validateInput(name)) {
        alert('Введите название объекта');
        return;
    }
    if (drawInteraction) {
        map.removeInteraction(drawInteraction);
    }
    const type = document.getElementById('objectType').value;
    drawInteraction = new ol.interaction.Draw({
        source: drawSource,
        type: CONFIG.GEOMETRY_TYPES[type]
    });
    map.addInteraction(drawInteraction);
    drawInteraction.on('drawend', (event) => {
        map.removeInteraction(drawInteraction);
        selectedFeature = event.feature;
        selectedFeature.setProperties({ name });
        saveChanges();
    });
}

function showEditPopup(feature) {
    selectedFeature = feature;
    const popup = document.getElementById('editPopup');
    popup.classList.add('show');
    const geometry = feature.getGeometry();
    const coordinates = geometry.getCoordinates();
    popupCoordinates = geometry.getType() === 'Point' ? [ol.proj.toLonLat(coordinates)] : coordinates[0].map(coord => ol.proj.toLonLat(coord));
    const pixel = map.getPixelFromCoordinate(geometry.getType() === 'Point' ? coordinates : coordinates[0]);
    const mapRect = map.getTargetElement().getBoundingClientRect();
    const popupWidth = popup.offsetWidth || 200;
    const popupHeight = popup.offsetHeight || 50;
    popup.style.left = Math.max(10, Math.min(pixel[0] - popupWidth / 2, mapRect.width - popupWidth - 10)) + 'px';
    popup.style.top = Math.max(10, pixel[1] - popupHeight) + 'px';
    document.getElementById('editName').value = feature.get('name') || '';
    feature.setStyle(styles.selected);
    feature.getGeometry().on('change', () => showEditPopup(feature));
}

async function updateObject() {
    const newName = document.getElementById('editName').value;
    if (!validateInput(newName)) {
        alert('Название не может быть пустым');
        return;
    }
    if (selectedFeature && selectedFeature.get('id')) {
        selectedFeature.set('name', newName);
        const geometry = selectedFeature.getGeometry();
        const coordinates = geometry.getCoordinates();
        const transformedCoords = geometry.getType() === 'Point'
            ? { x: ol.proj.toLonLat(coordinates)[0], y: ol.proj.toLonLat(coordinates)[1] }
            : coordinates[0].map(coord => ({ x: ol.proj.toLonLat(coord)[0], y: ol.proj.toLonLat(coord)[1] }));
        await fetchWithErrorHandling(`${CONFIG.API_URL}/${selectedFeature.get('id')}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, type: selectedFeature.get('type'), coordinates: transformedCoords })
        });
        alert('Объект обновлён');
        cancelEdit();
    } else {
        alert('Объект ещё не сохранён на сервере');
    }
}

async function deleteObject() {
    if (selectedFeature && selectedFeature.get('id')) {
        await fetchWithErrorHandling(`${CONFIG.API_URL}/${selectedFeature.get('id')}`, {
            method: 'DELETE'
        });
        drawSource.removeFeature(selectedFeature);
        alert('Объект удалён');
        cancelEdit();
    }
}

async function saveChanges() {
    if (selectedFeature) {
        const name = selectedFeature.get('name');
        const geometry = selectedFeature.getGeometry();
        const coordinates = geometry.getCoordinates();
        const transformedCoords = geometry.getType() === 'Point'
            ? { x: ol.proj.toLonLat(coordinates)[0], y: ol.proj.toLonLat(coordinates)[1] }
            : coordinates[0].map(coord => ({ x: ol.proj.toLonLat(coord)[0], y: ol.proj.toLonLat(coord)[1] }));
        const data = await fetchWithErrorHandling(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type: document.getElementById('objectType').value, coordinates: transformedCoords })
        });
        selectedFeature.set('id', data.id);
        alert('Объект сохранён с ID: ' + data.id);
        loadObjects();
        cancelEdit();
    }
}

function cancelEdit() {
    const popup = document.getElementById('editPopup');
    if (popup) popup.classList.remove('show');
    selectedFeature = null;
    popupCoordinates = null;
    drawSource.getFeatures().forEach(feature => feature.setStyle(null));
}

function handleMapClick(event) {
    const feature = map.forEachFeatureAtPixel(event.pixel, feature => feature);
    if (feature) {
        if (selectedFeature) selectedFeature.setStyle(null);
        selectedFeature = feature;
        showEditPopup(feature);
    } else if (selectedFeature) {
        selectedFeature.setStyle(null);
        cancelEdit();
    }
}

function updateObjectList() {
    const list = document.getElementById('objects');
    list.innerHTML = '';
    drawSource.getFeatures().forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature.get('name') || 'Без названия';
        li.style.cursor = 'pointer';
        li.onclick = () => {
            map.getView().fit(feature.getGeometry().getExtent(), { duration: 500 });
            showEditPopup(feature);
        };
        list.appendChild(li);
    });
}

function saveState() {
    localStorage.setItem('objectType', document.getElementById('objectType').value);
    localStorage.setItem('mapView', JSON.stringify({
        center: ol.proj.toLonLat(map.getView().getCenter()),
        zoom: map.getView().getZoom()
    }));
}

function loadState() {
    const objectType = localStorage.getItem('objectType');
    if (objectType) document.getElementById('objectType').value = objectType;
    const viewState = JSON.parse(localStorage.getItem('mapView'));
    if (viewState) {
        map.getView().setCenter(ol.proj.fromLonLat(viewState.center));
        map.getView().setZoom(viewState.zoom);
    }
}

initMap();

window.startDrawing = startDrawing;
window.saveChanges = saveChanges;
window.cancelEdit = cancelEdit;
window.updateObject = updateObject;
window.deleteObject = deleteObject;