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

async function fetchWithErrorHandling(url, options = {}) {
    try {
        if (options && options.body) {
            console.log('Request body:', JSON.parse(options.body));
        }
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        if (response.status === 204) {
            return null;
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
                        coords = obj.coordinates[0];
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
        if (!selectedFeature) {
            console.error('selectedFeature is undefined after drawend');
            return;
        }
        selectedFeature.setProperties({ type: type });
        console.log('Drawing ended, calling showEditPopup with feature:', selectedFeature);
        showEditPopup(selectedFeature);
    });
}

function showEditPopup(feature) {
    console.log('Entering showEditPopup with feature:', feature);
    if (!feature || !feature.getGeometry()) {
        console.error('Invalid feature or geometry in showEditPopup:', feature);
        return;
    }
    selectedFeature = feature;
    const popup = document.getElementById('editPopup');
    if (!popup) {
        console.error('Popup element not found');
        return;
    }
    console.log('Popup element found, adding "show" class, current classList:', popup.classList);
    popup.classList.add('show');
    // Задержка для обновления DOM
    setTimeout(() => {
        const geometry = feature.getGeometry();
        const coordinates = geometry.getCoordinates();
        popupCoordinates = geometry.getType() === 'Point' ? [ol.proj.toLonLat(coordinates)] : coordinates[0].map(coord => ol.proj.toLonLat(coord));
        const pixel = map.getPixelFromCoordinate(geometry.getType() === 'Point' ? coordinates : coordinates[0]);
        if (!pixel) {
            console.error('Failed to get pixel coordinates');
            return;
        }
        console.log('Calculated pixel coordinates:', pixel);
        const mapRect = map.getTargetElement().getBoundingClientRect();
        console.log('Map rect:', mapRect);
        const popupWidth = popup.offsetWidth || 200;
        const popupHeight = popup.offsetHeight || 50;
        const left = Math.max(10, Math.min(pixel[0] - popupWidth / 2, mapRect.width - popupWidth - 10));
        const top = Math.max(10, pixel[1] - popupHeight);
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
        console.log('Applied styles - left:', left, 'top:', top, 'width:', popupWidth, 'height:', popupHeight);
        document.getElementById('editName').value = feature.get('name') || '';
        feature.setStyle(styles.selected);
        feature.getGeometry().on('change', () => showEditPopup(feature));
        const deleteButton = document.querySelector('#editPopup button[onclick="deleteObject()"]');
        if (deleteButton) {
            deleteButton.disabled = !feature.get('id');
            console.log('Delete button found, disabled:', !feature.get('id'));
        } else {
            console.error('Delete button not found in popup');
        }
    }, 0); // Задержка 0ms для следующего цикла событий
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
        const type = selectedFeature.get('type') || document.getElementById('objectType').value;
        await fetchWithErrorHandling(`${CONFIG.API_URL}/${selectedFeature.get('id')}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, type, coordinates: transformedCoords })
        });
        alert('Объект обновлён');
        cancelEdit();
    } else {
        alert('Объект ещё не сохранён на сервере');
    }
}

async function deleteObject() {
    if (selectedFeature && selectedFeature.get('id')) {
        const result = await fetchWithErrorHandling(`${CONFIG.API_URL}/${selectedFeature.get('id')}`, {
            method: 'DELETE'
        });
        if (result === null) {
            drawSource.removeFeature(selectedFeature);
            alert('Объект удалён');
            cancelEdit();
            loadObjects();
        } else {
            alert('Неизвестный ответ от сервера');
        }
    }
}

async function saveChanges() {
    if (selectedFeature) {
        const name = document.getElementById('editName').value;
        if (!validateInput(name)) {
            alert('Название не может быть пустым');
            return;
        }
        const type = selectedFeature.get('type') || document.getElementById('objectType').value;
        if (!type) {
            alert('Тип объекта не определён');
            return;
        }
        selectedFeature.set('name', name);
        const geometry = selectedFeature.getGeometry();
        const coordinates = geometry.getCoordinates();
        const transformedCoords = geometry.getType() === 'Point'
            ? { x: ol.proj.toLonLat(coordinates)[0], y: ol.proj.toLonLat(coordinates)[1] }
            : coordinates[0].map(coord => ({ x: ol.proj.toLonLat(coord)[0], y: ol.proj.toLonLat(coord)[1] }));
        const requestBody = { name, type, coordinates: transformedCoords };
        console.log('Saving object:', requestBody);
        if (selectedFeature.get('id')) {
            // Обновление существующего объекта
            await fetchWithErrorHandling(`${CONFIG.API_URL}/${selectedFeature.get('id')}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selectedFeature.get('id'), ...requestBody })
            });
            alert('Объект обновлён с ID: ' + selectedFeature.get('id'));
        } else {
            // Создание нового объекта
            const data = await fetchWithErrorHandling(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            selectedFeature.set('id', data.id);
            alert('Объект сохранён с ID: ' + data.id);
        }
        loadObjects(); // Синхронизация с сервером
        cancelEdit();
    }
}

function cancelEdit() {
    const popup = document.getElementById('editPopup');
    if (popup) popup.classList.remove('show');
    if (selectedFeature && !selectedFeature.get('id')) {
        drawSource.removeFeature(selectedFeature);
    }
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