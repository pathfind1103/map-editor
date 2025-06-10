package com.pathfind1103.mapeditor.model;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

@Data
public class GeometricObject {
    private Long id;
    private String name;
    private String type;
    private JsonNode coordinates;
}
