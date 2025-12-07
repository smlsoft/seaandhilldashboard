'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Export data to Excel file with styling using ExcelJS
 * @param data - Array of objects to export
 * @param filename - Name of the exported file (without extension)
 * @param sheetName - Name of the Excel sheet (default: 'Data')
 */
export async function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = 'Data'
): Promise<void> {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dashboard System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);

  // Get headers from first row
  const headers = Object.keys(data[0]);
  
  // Add header row with styling
  worksheet.columns = headers.map((header) => ({
    header: header,
    key: header,
    width: Math.max(header.length + 5, 15),
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  // Add data rows
  data.forEach((row, index) => {
    const dataRow = worksheet.addRow(row);
    
    // Alternate row colors
    if (index % 2 === 0) {
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' },
      };
    }
    dataRow.alignment = { vertical: 'middle' };
  });

  // Add borders to all cells
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
    });
  });

  // Auto-fit columns based on content
  worksheet.columns.forEach((column) => {
    if (column.values) {
      const maxLength = column.values.reduce((max: number, value) => {
        const length = value ? String(value).length : 0;
        return Math.max(max, length);
      }, 10);
      column.width = Math.min(maxLength + 2, 50);
    }
  });

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, `${filename}.xlsx`);
}

/**
 * Export data to Excel with custom headers and styling
 * @param data - Array of objects to export
 * @param headers - Custom header mapping { dataKey: 'Display Name' }
 * @param filename - Name of the exported file (without extension)
 * @param sheetName - Name of the Excel sheet (default: 'Data')
 */
export async function exportToExcelWithHeaders<T extends Record<string, any>>(
  data: T[],
  headers: Record<string, string>,
  filename: string,
  sheetName: string = 'Data'
): Promise<void> {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Transform data with custom headers
  const transformedData = data.map((row) => {
    const newRow: Record<string, any> = {};
    Object.keys(headers).forEach((key) => {
      newRow[headers[key]] = row[key];
    });
    return newRow;
  });

  await exportToExcel(transformedData, filename, sheetName);
}

/**
 * Export multiple sheets to single Excel file with styling
 * @param sheets - Array of { data, sheetName, headers? }
 * @param filename - Name of the exported file (without extension)
 */
export async function exportMultipleSheetsToExcel(
  sheets: Array<{
    data: Record<string, any>[];
    sheetName: string;
    headers?: Record<string, string>;
  }>,
  filename: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dashboard System';
  workbook.created = new Date();

  sheets.forEach(({ data, sheetName, headers }) => {
    if (!data || data.length === 0) return;

    let exportData = data;
    if (headers) {
      exportData = data.map((row) => {
        const newRow: Record<string, any> = {};
        Object.keys(headers).forEach((key) => {
          newRow[headers[key]] = row[key];
        });
        return newRow;
      });
    }

    const worksheet = workbook.addWorksheet(sheetName);
    const dataHeaders = Object.keys(exportData[0]);

    // Add columns
    worksheet.columns = dataHeaders.map((header) => ({
      header: header,
      key: header,
      width: Math.max(header.length + 5, 15),
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Add data rows
    exportData.forEach((row, index) => {
      const dataRow = worksheet.addRow(row);
      if (index % 2 === 0) {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }
      dataRow.alignment = { vertical: 'middle' };
    });

    // Add borders
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column.values) {
        const maxLength = column.values.reduce((max: number, value) => {
          const length = value ? String(value).length : 0;
          return Math.max(max, length);
        }, 10);
        column.width = Math.min(maxLength + 2, 50);
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, `${filename}.xlsx`);
}

/**
 * Export styled report with title, date, and summary
 * @param options - Report options
 */
export async function exportStyledReport<T extends Record<string, any>>(
  options: {
    data: T[];
    headers: Record<string, string>;
    filename: string;
    sheetName?: string;
    title?: string;
    subtitle?: string;
    numberColumns?: string[]; // Column keys that should be formatted as numbers
    currencyColumns?: string[]; // Column keys that should be formatted as currency
    percentColumns?: string[]; // Column keys that should be formatted as percentage
  }
): Promise<void> {
  const {
    data,
    headers,
    filename,
    sheetName = 'Report',
    title,
    subtitle,
    numberColumns = [],
    currencyColumns = [],
    percentColumns = [],
  } = options;

  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dashboard System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);
  const headerKeys = Object.keys(headers);
  const headerValues = Object.values(headers);
  const colCount = headerKeys.length;

  let currentRow = 1;

  // Add title if provided
  if (title) {
    worksheet.mergeCells(currentRow, 1, currentRow, colCount);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF1F4E79' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 30;
    currentRow++;
  }

  // Add subtitle/date if provided
  if (subtitle) {
    worksheet.mergeCells(currentRow, 1, currentRow, colCount);
    const subtitleCell = worksheet.getCell(currentRow, 1);
    subtitleCell.value = subtitle;
    subtitleCell.font = { size: 11, color: { argb: 'FF666666' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;
  }

  // Add empty row before data
  if (title || subtitle) {
    currentRow++;
  }

  // Add header row
  const headerRowNum = currentRow;
  headerValues.forEach((header, index) => {
    const cell = worksheet.getCell(headerRowNum, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF2F5496' } },
      left: { style: 'thin', color: { argb: 'FF2F5496' } },
      bottom: { style: 'thin', color: { argb: 'FF2F5496' } },
      right: { style: 'thin', color: { argb: 'FF2F5496' } },
    };
  });
  worksheet.getRow(headerRowNum).height = 25;
  currentRow++;

  // Add data rows
  data.forEach((row, rowIndex) => {
    headerKeys.forEach((key, colIndex) => {
      const cell = worksheet.getCell(currentRow, colIndex + 1);
      let value = row[key];

      // Apply number formatting
      if (currencyColumns.includes(key)) {
        cell.value = typeof value === 'number' ? value : parseFloat(value) || 0;
        cell.numFmt = '#,##0.00';
      } else if (percentColumns.includes(key)) {
        cell.value = typeof value === 'number' ? value / 100 : (parseFloat(value) || 0) / 100;
        cell.numFmt = '0.00%';
      } else if (numberColumns.includes(key)) {
        cell.value = typeof value === 'number' ? value : parseFloat(value) || 0;
        cell.numFmt = '#,##0';
      } else {
        cell.value = value;
      }

      // Alternate row colors
      if (rowIndex % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      }

      cell.alignment = { 
        vertical: 'middle',
        horizontal: numberColumns.includes(key) || currencyColumns.includes(key) || percentColumns.includes(key) 
          ? 'right' 
          : 'left'
      };

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
    });
    currentRow++;
  });

  // Auto-fit columns
  worksheet.columns.forEach((column, index) => {
    const header = headerValues[index] || '';
    let maxLength = header.length;
    
    data.forEach((row) => {
      const key = headerKeys[index];
      const value = row[key];
      const length = value ? String(value).length : 0;
      maxLength = Math.max(maxLength, length);
    });
    
    column.width = Math.min(maxLength + 4, 50);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, `${filename}.xlsx`);
}
