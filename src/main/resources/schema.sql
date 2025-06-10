CREATE TABLE IF NOT EXISTS geometric_objects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('marker', 'line', 'polygon')),
    coordinates JSONB NOT NULL
);