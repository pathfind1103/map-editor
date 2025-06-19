package com.pathfind1103.mapeditor.service.impl;

import com.pathfind1103.mapeditor.model.GeometricObject;
import com.pathfind1103.mapeditor.mapper.GeometricObjectMapper;
import com.pathfind1103.mapeditor.service.GeometricObjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GeometricObjectServiceImpl implements GeometricObjectService {
    @Autowired
    private GeometricObjectMapper mapper;

    @Override
    public List<GeometricObject> getAll() {
        return mapper.selectAll();
    }

    @Override
    public GeometricObject save(GeometricObject object) {
        if (object == null || object.getName() == null ||
                object.getType() == null || object.getCoordinates() == null) {
            throw new IllegalArgumentException("All fields are required");
        }

        if (!List.of("marker", "line", "polygon").contains(object.getType().toLowerCase())) {
            throw new IllegalArgumentException("Type must be 'marker', 'line' or 'polygon'");
        }

        mapper.insert(object);
        return object;
    }

    @Override
    public void deleteById(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("ID is required for deletion");
        }
        mapper.delete(id);
    }

    @Override
    public void deleteAll() {
        mapper.deleteAll();
    }

    @Override
    public void update(GeometricObject object) {
        if (object == null || object.getId() == null || object.getName() == null || object.getType() == null || object.getCoordinates() == null) {
            throw new IllegalArgumentException("ID and all fields are required for update");
        }

        if (!List.of("marker", "line", "polygon").contains(object.getType().toLowerCase())) {
            throw new IllegalArgumentException("Type must be 'marker', 'line' or 'polygon'");
        }
        mapper.update(object);
    }
}
