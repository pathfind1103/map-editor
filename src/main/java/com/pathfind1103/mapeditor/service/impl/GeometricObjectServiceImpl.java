package com.pathfind1103.mapeditor.service.impl;

import com.pathfind1103.mapeditor.model.GeometricObject;
import com.pathfind1103.mapeditor.mapper.GeometricObjectMapper;
import com.pathfind1103.mapeditor.service.GeometricObjectService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GeometricObjectServiceImpl implements GeometricObjectService {
    private static final Logger logger = LoggerFactory.getLogger(GeometricObjectServiceImpl.class);
    private GeometricObjectMapper mapper;

    public GeometricObjectServiceImpl(GeometricObjectMapper mapper) {
        this.mapper = mapper;
        logger.info("GeometricObjectServiceImpl initialized");
    }

    @Override
    public List<GeometricObject> getAll() {
        logger.debug("Fetching all geometric objects");
        return mapper.selectAll();

    }

    @Override
    public GeometricObject save(GeometricObject object) {
        logger.debug("Saving geometric object: {}", object.getName());
        if (object == null || object.getName() == null ||
                object.getType() == null || object.getCoordinates() == null) {
            logger.error("Validation failed: All fields are required");
            throw new IllegalArgumentException("All fields are required");
        }

        if (!List.of("marker", "line", "polygon").contains(object.getType().toLowerCase())) {
            logger.warn("Invalid type provided: {}", object.getType());
            throw new IllegalArgumentException("Type must be 'marker', 'line' or 'polygon'");
        }

        mapper.insert(object);
        logger.info("Successfully saved object with ID: {}", object.getId());
        return object;
    }

    @Override
    public void deleteById(Long id) {
        logger.debug("Deleting geometric object with ID: {}", id);
        if (id == null) {
            logger.error("Validation failed: ID is required for deletion");
            throw new IllegalArgumentException("ID is required for deletion");
        }
        mapper.delete(id);
        logger.info("Successfully deleted object with ID: {}", id);
    }

    @Override
    public void deleteAll() {
        logger.debug("Deleting all geometric objects");
        mapper.deleteAll();
        logger.info("Successfully deleted all geometric objects");
    }

    @Override
    public void update(GeometricObject object) {
        logger.debug("Updating geometric object with ID: {}", object.getId());
        if (object == null || object.getId() == null || object.getName() == null || object.getType() == null || object.getCoordinates() == null) {
            logger.error("Validation failed: ID and all fields are required for update");
            throw new IllegalArgumentException("ID and all fields are required for update");
        }

        if (!List.of("marker", "line", "polygon").contains(object.getType().toLowerCase())) {
            logger.warn("Invalid type provided: {}", object.getType());
            throw new IllegalArgumentException("Type must be 'marker', 'line' or 'polygon'");
        }
        mapper.update(object);
        logger.info("Successfully updated object with ID: {}", object.getId());
    }
}
