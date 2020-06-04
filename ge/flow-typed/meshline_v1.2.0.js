
declare class MeshLine implements THREE_Raycastable {
  +geometry: THREE.BufferGeometry;
   raycast(raycaster: THREE.Raycaster, intersects: Array<THREE_Intersection>) : void;
   setGeometry(geometry: THREE.Geometry) : void;
}

declare class MeshLineMaterial extends THREE.Material {
   constructor(parameters: {color?: THREE.Color, lineWidth?: number, sizeAttenuation?: boolean, side?: number, resolution?: THREE.Vector2, fog?: boolean}) : void;
}
