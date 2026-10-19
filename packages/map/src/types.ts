/**
 * Map data model shared by the app and (later) the server.
 * Coordinates use the floor's declared units from the top-left of its plan.
 * Legacy size and cost field names contain M; schematic data is not metric.
 */

export type NodeType = 'corridor' | 'door' | 'stairs' | 'elevator' | 'entrance';
export type EdgeKind = 'walk' | 'stairs' | 'elevator';
export type RoomCategory = 'classroom' | 'lab' | 'office' | 'wc' | 'cafe' | 'library' | 'service' | 'other';
export type RouteMode = 'fastest' | 'accessible';

export interface Building {
  id: string;
  name: string;
  address: string;
  dataVersion: number;
}

export interface Floor {
  id: string;
  buildingId: string;
  /** 0 = basement, 1 = ground floor, and so on. */
  level: number;
  name: string;
  /** Public URL of the SVG plan. Empty for plans bundled with the app. */
  svgUrl: string;
  widthM: number;
  heightM: number;
  /** Defaults to meters for older bundles. Drawing units have no physical scale. */
  coordinateUnit?: 'meters' | 'drawing';
}

export interface MapNode {
  id: string;
  floorId: string;
  x: number;
  y: number;
  type: NodeType;
  /** Shown to users, e.g. "Stairs B" or "Main entrance". */
  label?: string;
}

export interface Edge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  kind: EdgeKind;
  /** Meters. Euclidean distance for walk, 15 per floor for stairs, 30 for elevator. */
  weight: number;
  /** False for stairs: excluded in accessible mode. */
  accessible: boolean;
}

export interface Room {
  id: string;
  floorId: string;
  /** Unique in the building, e.g. "B204". */
  code: string;
  name: string;
  category: RoomCategory;
  doorNodeId: string;
  tags: string[];
  /** Where the app draws the room code on the plan. */
  labelAt?: { x: number; y: number };
  /** Optional map-unit font size for narrow room shapes. */
  labelSize?: number;
}

/** Full copy of one building's map data. */
export interface Snapshot {
  building: Building;
  floors: Floor[];
  nodes: MapNode[];
  edges: Edge[];
  rooms: Room[];
}

/** A snapshot plus the SVG plans of its floors, keyed by floor id. */
export interface MapBundle {
  snapshot: Snapshot;
  svgByFloor: Record<string, string>;
}

/** Part of a route on one floor. */
export interface RouteSegment {
  floorId: string;
  nodeIds: string[];
}

export type RouteStep =
  | { kind: 'straight'; floorId: string; nodeId: string; distanceM: number }
  | { kind: 'turn'; floorId: string; nodeId: string; direction: 'left' | 'right' | 'back' }
  | {
      kind: 'changeFloor';
      floorId: string;
      nodeId: string;
      via: 'stairs' | 'elevator';
      toFloorId: string;
      toLevel: number;
      up: boolean;
      label?: string;
    }
  | { kind: 'arrive'; floorId: string; nodeId: string };

export interface Route {
  nodeIds: string[];
  /** Graph cost including transfer penalties; not physical meters on a schematic. */
  lengthM: number;
  mode: RouteMode;
  segments: RouteSegment[];
  steps: RouteStep[];
}

/** Anything a user can pick as a start or destination. */
export interface Place {
  id: string;
  nodeId: string;
  floorId: string;
  title: string;
  subtitle: string;
  kind: 'room' | NodeType;
  roomId?: string;
}
