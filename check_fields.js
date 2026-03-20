import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('BASEVAGAJAPREENCHIDA.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const wsname = wb.SheetNames[0];
const ws = wb.Sheets[wsname];
const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

console.log("COLUMNS:");
console.log(Object.keys(data[0]).join(', '));
console.log("\nSAMPLE:");
console.log(JSON.stringify(data[0], null, 2));
