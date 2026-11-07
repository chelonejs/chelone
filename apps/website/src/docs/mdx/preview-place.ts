// Its own file, with no imports, so the Vue demo app can seed a form with it too.
/**
 * A place with the shapes the map fields show, for the maps demos: a point, a
 * delivery zone, a bounding box that holds it, and a footprint and a route
 * inside it. Handed to each field as `record`, so no resource is involved.
 */
export const previewPlace = {
  id: 1,
  name: "Praça do Comércio",
  address: "Praça do Comércio, 1100-148 Lisboa",
  lat: 38.7075,
  lng: -9.1364,
  zone: {
    type: "Polygon",
    coordinates: [
      [
        [-9.12975, 38.7075],
        [-9.133075, 38.712047],
        [-9.139725, 38.712047],
        [-9.14305, 38.7075],
        [-9.139725, 38.702953],
        [-9.133075, 38.702953],
        [-9.12975, 38.7075],
      ],
    ],
  },
  bbox: [-9.1431, 38.7023, -9.1297, 38.7127],
  area: {
    type: "Polygon",
    coordinates: [
      [
        [-9.1383, 38.706],
        [-9.1345, 38.706],
        [-9.1345, 38.709],
        [-9.1383, 38.709],
        [-9.1383, 38.706],
      ],
    ],
  },
  route: {
    type: "LineString",
    coordinates: [
      [-9.1402, 38.7045],
      [-9.1364, 38.706],
      [-9.1326, 38.7105],
    ],
  },
};
