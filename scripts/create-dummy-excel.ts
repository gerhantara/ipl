import ExcelJS from 'exceljs';

async function createDummyExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data Warga');

  // Add headers
  worksheet.columns = [
    { header: 'email', key: 'email', width: 30 },
    { header: 'full_name', key: 'full_name', width: 25 },
    { header: 'phone', key: 'phone', width: 15 },
    { header: 'blok_rumah', key: 'blok_rumah', width: 12 },
    { header: 'status_kepemilikan', key: 'status_kepemilikan', width: 20 },
    { header: 'role', key: 'role', width: 10 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add dummy data
  const dummyData = [
    { email: 'budi.santoso@email.com', full_name: 'Budi Santoso', phone: '081234567890', blok_rumah: 'A1', status_kepemilikan: 'milik_sendiri', role: 'warga' },
    { email: 'siti.rahayu@email.com', full_name: 'Siti Rahayu', phone: '081234567891', blok_rumah: 'A2', status_kepemilikan: 'milik_sendiri', role: 'warga' },
    { email: 'ahmad.hidayat@email.com', full_name: 'Ahmad Hidayat', phone: '081234567892', blok_rumah: 'B1', status_kepemilikan: 'kontrak', role: 'warga' },
    { email: 'dewi.lestari@email.com', full_name: 'Dewi Lestari', phone: '081234567893', blok_rumah: 'B2', status_kepemilikan: 'milik_sendiri', role: 'warga' },
    { email: 'eko.prasetyo@email.com', full_name: 'Eko Prasetyo', phone: '081234567894', blok_rumah: 'C1', status_kepemilikan: 'kontrak', role: 'warga' },
    { email: 'ratna.wati@email.com', full_name: 'Ratna Wati', phone: '081234567895', blok_rumah: 'C2', status_kepemilikan: 'milik_sendiri', role: 'warga' },
    { email: 'admin.komplek@email.com', full_name: 'Admin Komplek', phone: '081234567896', blok_rumah: 'OFFICE', status_kepemilikan: 'milik_sendiri', role: 'admin' },
  ];

  worksheet.addRows(dummyData);

  // Save the file
  await workbook.xlsx.writeFile('public/template_data_warga.xlsx');
  console.log('✅ Dummy Excel file created: public/template_data_warga.xlsx');
}

createDummyExcel().catch(console.error);