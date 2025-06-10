package com.pathfind1103.mapeditor.mapper;


import com.pathfind1103.mapeditor.model.GeometricObject;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface GeometricObjectMapper {
    List<GeometricObject> selectAll();
    void insert(GeometricObject object);
}
