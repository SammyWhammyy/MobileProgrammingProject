export type * from './types';
export { defineSnapshot, type EdgeSpec, type SnapshotSpec } from './authoring';
export { findPath, ELEVATOR_WEIGHT, STAIRS_WEIGHT_PER_FLOOR, type PathResult } from './astar';
export { buildGraph, type Graph, type GraphLink } from './graph';
export { buildSteps, splitByFloor, turnAt } from './steps';
export { getGraph, planRoute } from './route';
export { listPlaces, searchPlaces } from './places';
export { describeStep } from './describe';
export { PLAN_ROOM_COLOR, PLAN_WALL_COLOR } from './data/planColors';
export { testBuilding } from './data/testBuilding';
export { hamkC2 } from './data/hamkC2';
export { buildingC } from './data/buildingC';
export { loadStoredMap, type MapDatabase } from './storage';
export { assertMapBundle } from './validate';
export { initializeNotes, createNotesRepository, NOTE_TITLE_LIMIT, NOTE_BODY_LIMIT,
  type RoomNote, type NoteInput, type NotesDatabase, type NotesRepository } from './notes';
