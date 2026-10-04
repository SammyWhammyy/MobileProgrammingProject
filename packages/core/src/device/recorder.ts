import * as Device from 'expo-device';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { RecorderSnapshot, Recording } from '../types';

const recordingsDir = new Directory(Paths.document, 'recordings');
const FLUSH_INTERVAL_MS = 1000;

let file: File | null = null;
let buffer: string[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

export const recorderState: RecorderSnapshot = {
  active: false,
  label: '',
  fileName: null,
  startedAt: null,
  stopAt: null,
  counts: {},
};

export function record(type: string, data: unknown) {
  if (!recorderState.active) return;
  buffer.push(JSON.stringify({ t: Date.now(), type, data }));
  recorderState.counts[type] = (recorderState.counts[type] ?? 0) + 1;
}

function flush() {
  if (recorderState.stopAt !== null && Date.now() >= recorderState.stopAt) {
    stopRecording();
    return;
  }
  if (!file || buffer.length === 0) return;
  file.write(buffer.join('\n') + '\n', { append: true });
  buffer = [];
}

function slug(text: string) {
  return text.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'unlabeled';
}

function timestampForFileName(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/** durationMs = null records until stopRecording() is called. */
export function startRecording(label: string, durationMs: number | null) {
  if (recorderState.active) stopRecording();

  recordingsDir.create({ idempotent: true, intermediates: true });
  const now = new Date();
  file = new File(recordingsDir, `${timestampForFileName(now)}_${slug(label)}.jsonl`);
  file.create();

  Object.assign(recorderState, {
    active: true,
    label,
    fileName: file.name,
    startedAt: now.getTime(),
    stopAt: durationMs === null ? null : now.getTime() + durationMs,
    counts: {},
  });

  record('meta', {
    label,
    startedAt: now.toISOString(),
    durationMs,
    platform: Platform.OS,
    osVersion: Device.osVersion,
    manufacturer: Device.manufacturer,
    model: Device.modelName,
  });
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
}

export function stopRecording() {
  if (!recorderState.active) return;
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
  recorderState.stopAt = null;
  flush();
  recorderState.active = false;
  file = null;
}

export function listRecordings(): Recording[] {
  if (!recordingsDir.exists) return [];
  return recordingsDir
    .list()
    .filter((entry): entry is File => entry instanceof File)
    .map((f) => ({ name: f.name, uri: f.uri, size: f.size ?? 0 }))
    .sort((a, b) => b.name.localeCompare(a.name));
}

export async function shareRecording(uri: string) {
  await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export recording' });
}

export function deleteRecording(uri: string) {
  new File(uri).delete();
}
