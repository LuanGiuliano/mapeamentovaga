import fs from 'fs';
import * as XLSX from 'xlsx';
const buf = fs.readFileSync('BASEVAGAJAPREENCHIDA.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const wsname = wb.SheetNames[0];
const ws = wb.Sheets[wsname];
const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
fs.writeFileSync('out.json', JSON.stringify({
  columns: Object.keys(data[0]),
  sample: data.slice(0,2)
}, null, 2));
