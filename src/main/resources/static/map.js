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

    const toggleButton = document.getElementById('toggleObjectsList');
    const objectsList = document.getElementById('objectsList');
    const toggleBackground = document.getElementById('toggleObjectsListBackground');
    toggleButton.addEventListener('click', () => {
        const isOpen = objectsList.classList.toggle('show');
        objectsList.style.transition = 'right 0.3s ease';
        toggleButton.style.transition = 'right 0.3s ease';
        toggleBackground.style.transition = 'right 0.3s ease';
        if (isOpen) {
            objectsList.style.right = '0';
            toggleButton.style.right = '331px';
            toggleBackground.style.right = '350px';
            toggleButton.textContent = '←';
        } else {
            objectsList.style.right = '-300px';
            toggleButton.style.right = '41px';
            toggleBackground.style.right = '60px';
            toggleButton.textContent = '→';
        }
    });

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
        // Для DELETE (одиночного или массового) возвращаем true для успешного статуса
        if (options.method === 'DELETE' && (response.status === 200 || response.status === 204)) {
            return true;
        }
        // Для PUT не разбираем JSON, если статус 204 или 200
        if (options.method === 'PUT' && (response.status === 204 || response.status === 200)) {
            return true;
        }
        // Для других методов (POST) разбираем JSON, если есть тело
        if (response.status !== 204) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error(`Fetch error at ${url}`, error);
        alert(`Ошибка: ${error.message}`);
        throw error;
    }
}

async function loadObjects() {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.textContent = 'Загрузка...';
    document.body.appendChild(loadingIndicator);
    try {
        const objects = await fetchWithErrorHandling(CONFIG.API_URL);
        drawSource.clear();
        const objectsListContent = document.getElementById('objectsListContent');
        objectsListContent.innerHTML = '';
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

                const typeMap = {
                    'marker': 'Маркер',
                    'line': 'Линия',
                    'polygon': 'Область'
                };
                const li = document.createElement('li');
                li.textContent = `${obj.name}: ${typeMap[obj.type] || obj.type}`;
                li.addEventListener('click', () => {
                    map.getView().animate({
                        center: ol.proj.fromLonLat(
                            geometry.getType() === 'Point'
                                ? [obj.coordinates.x, obj.coordinates.y]
                                : [obj.coordinates[0].x, obj.coordinates[0].y]
                        ),
                        duration: 500
                    });
                    selectedFeature = feature;
                    showEditPopup(feature);
                });
                objectsListContent.appendChild(li);
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

function startDrawing(type) {
    if (drawInteraction) {
        map.removeInteraction(drawInteraction);
    }
    drawInteraction = new ol.interaction.Draw({
        source: drawSource,
        type: CONFIG.GEOMETRY_TYPES[type]
    });
    map.un('click', handleMapClick);
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
        const cancelDraw = document.getElementById('cancelDraw');
        if (cancelDraw) {
            cancelDraw.classList.remove('show');
        }
        setTimeout(() => map.on('click', handleMapClick), 100);
    });
    const cancelDraw = document.getElementById('cancelDraw');
    if (cancelDraw) {
        cancelDraw.classList.add('show');
    }
}

let isPopupRendering = false;

function showEditPopup(feature) {
    console.log('Entering showEditPopup with feature:', feature);
    if (!feature || !feature.getGeometry() || isPopupRendering) {
        console.warn('Invalid feature, geometry, or rendering in progress, skipping...', { feature, isPopupRendering });
        return;
    }
    selectedFeature = feature;
    const popup = document.getElementById('editPopup');
    if (!popup) {
        console.error('Popup element not found');
        return;
    }
    popup.classList.add('show');
    isPopupRendering = true;

    function attemptRenderPopup(attempt = 0) {
        const input = document.getElementById('editName');
        const buttons = document.querySelectorAll('#editPopup button');
        if (!input || buttons.length < 3) {
            if (attempt < 10) {
                console.warn(`Popup not ready (attempt ${attempt + 1}), retrying...`);
                setTimeout(() => attemptRenderPopup(attempt + 1), 50);
            } else {
                console.error('Popup rendering failed after multiple attempts.');
                isPopupRendering = false;
            }
            return;
        }

        input.value = feature.get('name') || '';
        feature.setStyle(styles.selected);

        const deleteButton = document.querySelector('#editPopup button[onclick="deleteObject()"]');
        if (deleteButton) {
            deleteButton.style.display = feature.get('id') ? 'inline-block' : 'none';
            deleteButton.disabled = !feature.get('id');
        }

        isPopupRendering = false;
    }

    requestAnimationFrame(() => attemptRenderPopup());
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
        const type = selectedFeature.get('type') || 'marker';
        await fetchWithErrorHandling(`${CONFIG.API_URL}/${selectedFeature.get('id')}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, type, coordinates: transformedCoords })
        });
        cancelEdit();
        loadObjects();
    } else {
        alert('Объект ещё не сохранён на сервере');
    }
}

async function deleteObject() {
    if (selectedFeature && selectedFeature.get('id')) {
        try {
            const success = await fetchWithErrorHandling(`${CONFIG.API_URL}/${selectedFeature.get('id')}`, {
                method: 'DELETE'
            });
            if (success) { // Успешный статус 200 или 204
                drawSource.removeFeature(selectedFeature); // Удаляем маркер с карты
                selectedFeature.setStyle(null); // Убираем выделение
                cancelEdit(); // Закрываем попап
                loadObjects(); // Обновляем список объектов
            } else {
                alert('Неизвестный ответ от сервера');
            }
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            alert(`Ошибка: ${error.message}`);
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
        const type = selectedFeature.get('type');
        if (!type) {
            alert('Тип объекта не определён');
            return;
        }
        selectedFeature.set('name', name);
        const geometry = selectedFeature.getGeometry();
        const coordinates = geometry.getCoordinates();
        let transformedCoords;
        if (geometry.getType() === 'Point') {
            transformedCoords = { x: ol.proj.toLonLat(coordinates)[0], y: ol.proj.toLonLat(coordinates)[1] };
        } else if (geometry.getType() === 'LineString') {
            transformedCoords = coordinates.map(coord => ({ x: ol.proj.toLonLat(coord)[0], y: ol.proj.toLonLat(coord)[1] }));
        } else if (geometry.getType() === 'Polygon') {
            transformedCoords = coordinates[0].map(coord => ({ x: ol.proj.toLonLat(coord)[0], y: ol.proj.toLonLat(coord)[1] }));
        }
        const requestBody = { name, type, coordinates: transformedCoords };
        console.log('Saving object:', requestBody);
        if (selectedFeature.get('id')) {
            await fetchWithErrorHandling(`${CONFIG.API_URL}/${selectedFeature.get('id')}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selectedFeature.get('id'), ...requestBody })
            });
        } else {
            const data = await fetchWithErrorHandling(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            selectedFeature.set('id', data.id);
        }
        loadObjects();
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
    console.log('Handling map click at pixel:', event.pixel);
    const feature = map.forEachFeatureAtPixel(event.pixel, feature => feature.get('id') ? feature : null);
    if (feature) {
        console.log('Feature found at click:', feature, 'Properties:', feature.getProperties());
        if (selectedFeature) selectedFeature.setStyle(null);
        selectedFeature = feature;
        console.log('Selected feature set to:', selectedFeature, 'ID:', selectedFeature.get('id'), 'Name:', selectedFeature.get('name'));
        showEditPopup(selectedFeature);
    } else if (selectedFeature) {
        console.log('No feature with ID at click, current selectedFeature:', selectedFeature);
        selectedFeature.setStyle(null);
        cancelEdit();
    } else {
        console.log('No feature with ID at click and no selectedFeature');
    }
}

function cancelDrawing() {
    if (drawInteraction) {
        map.removeInteraction(drawInteraction);
        drawInteraction = null;
        const cancelDraw = document.getElementById('cancelDraw');
        if (cancelDraw) {
            cancelDraw.classList.remove('show');
        }
        selectedFeature = null;
    }
}

async function deleteAllObjects() {
    if (confirm('Вы уверены, что хотите удалить все объекты? Это действие необратимо.')) {
        try {
            const success = await fetchWithErrorHandling(CONFIG.API_URL, {
                method: 'DELETE'
            });
            if (success) {
                drawSource.clear(); // Очищаем все объекты с карты
                loadObjects(); // Обновляем список объектов
                alert('Все объекты успешно удалены.');
            }
        } catch (error) {
            console.error('Ошибка при удалении всех объектов:', error);
            alert('Произошла ошибка при удалении всех объектов.');
        }
    }
}

initMap();

window.startDrawing = startDrawing;
window.saveChanges = saveChanges;
window.cancelEdit = cancelEdit;
window.updateObject = updateObject;
window.deleteObject = deleteObject;
window.cancelDrawing = cancelDrawing;
window.deleteAllObjects = deleteAllObjects; // Добавлено