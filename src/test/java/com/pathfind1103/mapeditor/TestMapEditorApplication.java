package com.pathfind1103.mapeditor;

import org.springframework.boot.SpringApplication;

public class TestMapEditorApplication {

	public static void main(String[] args) {
		SpringApplication.from(MapEditorApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
