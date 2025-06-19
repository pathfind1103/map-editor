package com.pathfind1103.mapeditor.controller;

import com.pathfind1103.mapeditor.model.GeometricObject;
import com.pathfind1103.mapeditor.service.GeometricObjectService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/objects")
public class GeometricObjectController {
    private static final Logger logger = LoggerFactory.getLogger(GeometricObjectController.class);
    private GeometricObjectService service;

    public GeometricObjectController(GeometricObjectService service) {
        this.service = service;
        logger.info("GeometricObjectController initialized");
    }

    @GetMapping
    public List<GeometricObject> getAll() {
        logger.debug("Fetching all geometric objects");
        return service.getAll();
    }

    @PostMapping
    public GeometricObject create(@RequestBody GeometricObject object) {
        logger.debug("Creating new geometric object: {}", object.getName());
        GeometricObject savedObject = service.save(object);
        logger.info("Created object with ID: {}", savedObject.getId());
        return savedObject;
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        logger.debug("Deleting geometric object with ID: {}", id);
        service.deleteById(id);
        logger.info("Deleted object with ID: {}", id);
    }

    @DeleteMapping
    public void deleteAll() {
        logger.debug("Deleting all geometric objects");
        service.deleteAll();
        logger.info("All geometric objects deleted");
    }

    @PutMapping("/{id}")
    public void update(@PathVariable Long id, @RequestBody GeometricObject object) {
        logger.debug("Updating geometric object with ID: {}", id);
        if (object.getId() == null) {
            object.setId(id);
        } else if (!object.getId().equals(id)) {
            logger.warn("ID mismatch: path ID {} does not match body ID {}", id, object.getId());
            throw new IllegalArgumentException("ID in path must match ID in body");
        }
        service.update(object);
        logger.info("Updated object with ID: {}", id);
    }
}
