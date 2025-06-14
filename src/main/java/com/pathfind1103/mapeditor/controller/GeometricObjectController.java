package com.pathfind1103.mapeditor.controller;

import com.pathfind1103.mapeditor.model.GeometricObject;
import com.pathfind1103.mapeditor.service.GeometricObjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/objects")
public class GeometricObjectController {
    @Autowired
    private GeometricObjectService service;

    @GetMapping
    public List<GeometricObject> getAll() {
        return service.getAll();
    }

    @PostMapping
    public GeometricObject create(@RequestBody GeometricObject object) {
        return service.save(object);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.deleteById(id);
    }

    @PutMapping("/{id}")
    public void update(@PathVariable Long id, @RequestBody GeometricObject object) {
        if (object.getId() == null) {
            object.setId(id);
        } else if (!object.getId().equals(id)) {
            throw new IllegalArgumentException("ID in path must match ID in body");
        }
        service.update(object);
    }
}
