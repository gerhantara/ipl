// Script to generate dummy Excel file for testing bulk user upload
const ExcelJS = require('exceljs');
const path = require('path');

const dummyData = [
  { email: 'budi.santoso@email.com', full_name: 'Budi Santoso', phone: '081234567801', blok_rumah: 'A1', role: 'warga' },
  { email: 'siti.aminah@email.com', full_name: 'Siti Aminah', phone: '081234567802', blok_rumah: 'A2', role: 'warga' },
  { email: 'agus.priyono@email.com', full_name: 'Agus Priyono', phone: '081234567803', blok_rumah: 'A3', role: 'warga' },
  { email: 'dewi.lestari@email.com', full_name: 'Dewi Lestari', phone: '081234567804', blok_rumah: 'B1', role: 'warga' },
  { email: 'rahmat.hidayat@email.com', full_name: 'Rahmat Hidayat', phone: '081234567805', blok_rumah: 'B2', role: 'warga' },
  { email: 'nurhaliza@email.com', full_name: 'Nurhaliza', phone: '081234567806', blok_rumah: 'B3', role: 'warga' },
  { email: 'ahmad.fauzi@email.com', full_name: 'Ahmad Fauzi', phone: '081234567807', blok_rumah: 'C1', role: 'warga' },
  { email: 'kartika.sari@email.com', full_name: 'Kartika Sari', phone: '081234567808', blok_rumah: 'C2', role: 'warga' },
  { email: 'joko.widodo@email.com', full_name: 'Joko Widodo', phone: '081234567809', blok_rumah: 'C3', role: 'warga' },
  { email: 'mega.putri@email.com', full_name: 'Mega Putri', phone: '081234567810', blok_rumah: 'D1', role: 'warga' },
];

async function generateExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data Warga');

  // Add headers
  worksheet.columns = [
    { header: 'email', key: 'email', width: 30 },
    { header: 'full_name', key: 'full_name', width: 25 },
    { header: 'phone', key: 'phone', width: 18 },
    { header: 'blok_rumah', key: 'blok_rumah', width: 12 },
    { header: 'role', key: 'role', width: 10 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add data rows
  dummyData.forEach(row => {
    worksheet.addRow(row);
  });

  // Write file
  const outputPath = path.join(__dirname, '..', 'public', 'template_data_warga.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Dummy Excel file generated: ${outputPath}`);
}

generateExcel().catch(console.error);