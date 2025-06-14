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
    public void deleteById(@PathVariable Long id) {
        service.deleteById(id);
    }
}
