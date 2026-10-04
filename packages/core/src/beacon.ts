import type { BeaconInfo } from './types';

const EDDYSTONE_SERVICE = '0000feaa-0000-1000-8000-00805f9b34fb';
const URL_SCHEMES = ['http://www.', 'https://www.', 'http://', 'https://'];
const URL_EXPANSIONS = [
  '.com/', '.org/', '.edu/', '.net/', '.info/', '.biz/', '.gov/',
  '.com', '.org', '.edu', '.net', '.info', '.biz', '.gov',
];

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const int8 = (b: number) => (b > 127 ? b - 256 : b);

export function parseBeacon(
  manufacturerData: string | null,
  serviceData: Record<string, string> | null,
): BeaconInfo | null {
  if (manufacturerData) {
    const d = base64ToBytes(manufacturerData);
    // Apple company id 0x004C (little endian), type 0x02, length 0x15.
    if (d.length >= 25 && d[0] === 0x4c && d[1] === 0x00 && d[2] === 0x02 && d[3] === 0x15) {
      const u = hex(d.slice(4, 20));
      return {
        kind: 'iBeacon',
        uuid: `${u.slice(0, 8)}-${u.slice(8, 12)}-${u.slice(12, 16)}-${u.slice(16, 20)}-${u.slice(20)}`,
        major: (d[20] << 8) | d[21],
        minor: (d[22] << 8) | d[23],
        txPower: int8(d[24]),
      };
    }
  }

  const eddystone = serviceData?.[EDDYSTONE_SERVICE];
  if (eddystone) {
    const d = base64ToBytes(eddystone);
    if (d[0] === 0x00 && d.length >= 18) {
      return {
        kind: 'Eddystone-UID',
        namespace: hex(d.slice(2, 12)),
        instance: hex(d.slice(12, 18)),
        txPower: int8(d[1]),
      };
    }
    if (d[0] === 0x10 && d.length >= 3) {
      let url = URL_SCHEMES[d[2]] ?? '';
      for (const b of d.slice(3)) url += URL_EXPANSIONS[b] ?? String.fromCharCode(b);
      return { kind: 'Eddystone-URL', url, txPower: int8(d[1]) };
    }
    if (d[0] === 0x20) return { kind: 'Eddystone-TLM' };
  }
  return null;
}

export function describeBeacon(b: BeaconInfo): string {
  switch (b.kind) {
    case 'iBeacon':
      return `iBeacon ${b.uuid} major ${b.major} minor ${b.minor} tx ${b.txPower}`;
    case 'Eddystone-UID':
      return `Eddystone ${b.namespace}/${b.instance} tx ${b.txPower}`;
    case 'Eddystone-URL':
      return `Eddystone ${b.url}`;
    case 'Eddystone-TLM':
      return 'Eddystone TLM';
  }
}
