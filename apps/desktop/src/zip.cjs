// Klein zip-formaat voor .folio-bestanden (website delen). Geen extra pakketten nodig.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// Al gecomprimeerde formaten slaan we op zonder nogmaals in te pakken (sneller, even klein).
const STORE = /\.(jpe?g|png|webp|avif|gif|mp4|webm|mov|m4v|woff2?|zip|mp3|m4a|heic)$/i;

function dosTime(d) {
  return {
    time: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31),
    date: (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31),
  };
}

/** Schrijf een zip van `files` ([{ name, path } | { name, data }]) naar `out`. */
function writeZip(out, files) {
  const fd = fs.openSync(out, 'w');
  const central = [];
  let offset = 0;
  const { time, date } = dosTime(new Date());
  try {
    for (const f of files) {
      const raw = f.data ?? fs.readFileSync(f.path);
      const store = STORE.test(f.name) || raw.length < 64;
      const body = store ? raw : zlib.deflateRawSync(raw, { level: 6 });
      const crc = zlib.crc32(raw) >>> 0;
      if (offset + body.length > 0xfffffff0) throw new Error('De website is te groot om als één bestand te delen (meer dan 4 GB).');
      const name = Buffer.from(f.name.split(path.sep).join('/'), 'utf8');
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0x0800, 6); // UTF-8 namen
      local.writeUInt16LE(store ? 0 : 8, 8);
      local.writeUInt16LE(time, 10);
      local.writeUInt16LE(date, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(body.length, 18);
      local.writeUInt32LE(raw.length, 22);
      local.writeUInt16LE(name.length, 26);
      local.writeUInt16LE(0, 28);
      fs.writeSync(fd, local);
      fs.writeSync(fd, name);
      fs.writeSync(fd, body);
      const c = Buffer.alloc(46);
      c.writeUInt32LE(0x02014b50, 0);
      c.writeUInt16LE(20, 4);
      c.writeUInt16LE(20, 6);
      c.writeUInt16LE(0x0800, 8);
      c.writeUInt16LE(store ? 0 : 8, 10);
      c.writeUInt16LE(time, 12);
      c.writeUInt16LE(date, 14);
      c.writeUInt32LE(crc, 16);
      c.writeUInt32LE(body.length, 20);
      c.writeUInt32LE(raw.length, 24);
      c.writeUInt16LE(name.length, 28);
      c.writeUInt32LE(offset, 42);
      central.push(Buffer.concat([c, name]));
      offset += 30 + name.length + body.length;
    }
    const cd = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(central.length, 8);
    end.writeUInt16LE(central.length, 10);
    end.writeUInt32LE(cd.length, 12);
    end.writeUInt32LE(offset, 16);
    fs.writeSync(fd, cd);
    fs.writeSync(fd, end);
  } finally {
    fs.closeSync(fd);
  }
}

/** Lees alle bestanden uit een zip: [{ name, data }]. Namen met ../ of absolute paden worden geweigerd. */
function readZip(file) {
  const buf = fs.readFileSync(file);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Dit is geen geldig Folio-bestand.');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Het Folio-bestand is beschadigd.');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    const norm = path.posix.normalize(name);
    if (norm.startsWith('../') || norm.startsWith('/') || /^[a-z]:/i.test(norm) || norm.includes('\0')) throw new Error(`Ongeldige bestandsnaam in het Folio-bestand: ${name}`);
    const ln = buf.readUInt16LE(local + 26);
    const le = buf.readUInt16LE(local + 28);
    const start = local + 30 + ln + le;
    const body = buf.subarray(start, start + size);
    const data = method === 0 ? body : method === 8 ? zlib.inflateRawSync(body) : null;
    if (!data) throw new Error('Het Folio-bestand gebruikt een onbekende compressie.');
    out.push({ name: norm, data });
  }
  return out;
}

module.exports = { writeZip, readZip };
