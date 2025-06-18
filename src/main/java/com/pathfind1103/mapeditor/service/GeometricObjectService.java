package com.pathfind1103.mapeditor.service;

import com.pathfind1103.mapeditor.model.GeometricObject;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface GeometricObjectService {
    List<GeometricObject> getAll();
    GeometricObject save(GeometricObject object);
    void deleteById(Long id);
    void deleteAll();
    void update(GeometricObject object);
}
