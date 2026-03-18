import * as xlsx from 'xlsx';

const workbook = xlsx.readFile('c:\\Users\\Dynabook\\OneDrive\\Escritorio\\Quetzalez\\Aplicaciones\\Registro web\\public\\Inventario\\INVENTARIO 18-03-26.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Sheet Name:", sheetName);
console.log("Headers:", data[0]);
console.log("Row 1:", data[1]);
console.log("Row 2:", data[2]);
console.log("Row 3:", data[3]);
console.log("Total rows:", data.length);
