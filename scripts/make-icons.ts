import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

type RGB = [number, number, number];
const SUN: RGB = [255, 201, 60];
const INK: RGB = [31, 42, 68];
const WHITE: RGB = [255, 255, 255];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size: number, pixel: (x: number, y: number) => RGB): Buffer {
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * stride + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function inRoundRect(x: number, y: number, x0: number, y0: number, x1: number, y1: number, r: number): boolean {
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** 黄色底上一个白色键帽（深蓝描边和投影）、两只眼睛、一个小凸点；都在中间 80% 的安全区里 */
function keycap(size: number) {
  return (px: number, py: number): RGB => {
    const x = (px + 0.5) / size;
    const y = (py + 0.5) / size;
    if ((x - 0.4) ** 2 + (y - 0.47) ** 2 < 0.045 ** 2 || (x - 0.6) ** 2 + (y - 0.47) ** 2 < 0.045 ** 2) return INK;
    if (inRoundRect(x, y, 0.42, 0.62, 0.58, 0.665, 0.02)) return INK;
    if (inRoundRect(x, y, 0.23, 0.24, 0.77, 0.78, 0.11)) return WHITE;
    if (inRoundRect(x, y, 0.2, 0.21, 0.8, 0.85, 0.14)) return INK;
    return SUN;
  };
}

mkdirSync('public', { recursive: true });
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
] as const) {
  writeFileSync(`public/${name}`, png(size, keycap(size)));
  console.log(`已生成 public/${name}`);
}
