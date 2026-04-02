'use client';

import { Document, Font, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import FileSaver from 'file-saver';
import type { ExcelSummaryConfig, SummaryType } from '@/lib/exportExcel';

const { saveAs } = FileSaver;

// Register Sarabun Thai font served from public/fonts/ (avoids CDN CORS / signed-URL issues)
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/fonts/Sarabun-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Sarabun-Bold.ttf',    fontWeight: 'bold'   },
  ],
});

// Hyphenation callback — disable hyphenation for Thai text
Font.registerHyphenationCallback((word) => [word]);

const COLORS = {
  text: '#000000',
  border: '#222222',
  grid: '#B8B8B8',
  summaryBg: '#F3F3F3',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 16,
    fontSize: 7,
    fontFamily: 'Sarabun',
    backgroundColor: COLORS.white,
  },
  reportHeader: {
    marginBottom: 2,
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 8,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 1,
  },
  topRightBlock: {
    position: 'absolute',
    top: 18,
    right: 16,
    alignItems: 'flex-end',
  },
  topRightText: {
    fontSize: 7,
    color: COLORS.text,
  },
  metaRow: {
    marginTop: 4,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderBottomStyle: 'solid',
    paddingBottom: 4,
  },
  metaBlockLeft: {
    width: '70%',
  },
  metaBlockRight: {
    width: '28%',
    alignItems: 'flex-end',
  },
  metaText: {
    fontSize: 7,
    color: COLORS.text,
    lineHeight: 1.3,
  },
  metaTextBold: {
    fontSize: 7,
    color: COLORS.text,
    lineHeight: 1.3,
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    //borderTopWidth: 1,
    //borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderStyle: 'solid',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.grid,
    borderBottomStyle: 'solid',
  },
  headerRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  summaryRow: {
    backgroundColor: COLORS.summaryBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderTopStyle: 'solid',
  },
  cell: {
    paddingVertical: 2,
    paddingHorizontal: 3,
    flexGrow: 1,
    flexBasis: 0,
    flexShrink: 1,
  },
  cellText: {
    fontFamily: 'Sarabun',
    fontSize: 7,
    color: COLORS.text,
  },
  headerCellText: {
    fontFamily: 'Sarabun',
    fontSize: 7,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summaryCellText: {
    fontFamily: 'Sarabun',
    fontSize: 7,
    fontWeight: 'bold',
    color: COLORS.text,
  },
});

function calculateSummary<T extends Record<string, any>>(
  data: T[],
  key: string,
  type: SummaryType
): number {
  const values = data
    .map((row) => parseFloat(row[key]))
    .filter((v) => !Number.isNaN(v));

  if (values.length === 0) return 0;

  switch (type) {
    case 'sum':
      return values.reduce((acc, val) => acc + val, 0);
    case 'avg':
      return values.reduce((acc, val) => acc + val, 0) / values.length;
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return 0;
  }
}

function formatCellValue(
  value: any,
  key: string,
  numberColumns: string[],
  currencyColumns: string[],
  percentColumns: string[]
): string {
  if (value === null || value === undefined) return '-';

  const num = typeof value === 'number' ? value : parseFloat(value);

  if (currencyColumns.includes(key) && !Number.isNaN(num)) {
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (percentColumns.includes(key) && !Number.isNaN(num)) {
    return `${num.toFixed(2)}%`;
  }

  if (numberColumns.includes(key) && !Number.isNaN(num)) {
    return num.toLocaleString('th-TH');
  }

  return String(value);
}

/** Compute column widths based on both header and sampled content length */
function computeColumnWidths<T extends Record<string, any>>(
  headerKeys: string[],
  headerValues: string[],
  data: T[]
): number[] {
  const MIN_WEIGHT = 4;
  const sampledRows = data.slice(0, 50);
  const weights = headerValues.map((header, index) => {
    const key = headerKeys[index];
    let maxLen = header.length;

    for (const row of sampledRows) {
      const value = row[key];
      const str = value === null || value === undefined ? '-' : String(value);
      if (str.length > maxLen) {
        maxLen = str.length;
      }
    }

    const isMostlyNumeric = sampledRows.every((row) => {
      const value = row[key];
      if (value === null || value === undefined || value === '') return true;
      return !Number.isNaN(parseFloat(String(value)));
    });

    return isMostlyNumeric ? Math.max(Math.min(maxLen, 12), MIN_WEIGHT) : Math.max(Math.min(maxLen, 28), MIN_WEIGHT);
  });

  const total = weights.reduce((s, w) => s + w, 0);
  return weights.map((w) => (w / total) * 100);
}

/** Format a Date to Thai locale string */
function thaiDatetime(): string {
  return new Date().toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractCompanyName(subtitle?: string): string {
  if (!subtitle) return 'ไม่ระบุกิจการ';

  const match = subtitle.match(/กิจการ\s*:\s*(.*?)\s*(?:\||$)/);
  if (!match || !match[1]) return 'ไม่ระบุกิจการ';

  const companyName = match[1].trim();
  return companyName || 'ไม่ระบุกิจการ';
}

function stripCompanyFromSubtitle(subtitle?: string): string {
  if (!subtitle) return '';
  return subtitle.replace(/^\s*กิจการ\s*:\s*.*?\s*\|\s*/, '').trim();
}

function formatThaiDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;

  const [_, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function localizeDateRangeText(text: string): string {
  return text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (dateStr) => formatThaiDate(dateStr));
}

export async function exportStyledPdfReport<T extends Record<string, any>>(options: {
  data: T[];
  headers: Record<string, string>;
  filename: string;
  title?: string;
  subtitle?: string;
  numberColumns?: string[];
  currencyColumns?: string[];
  percentColumns?: string[];
  summaryConfig?: ExcelSummaryConfig;
}): Promise<void> {
  const {
    data,
    headers,
    filename,
    title,
    subtitle,
    numberColumns = [],
    currencyColumns = [],
    percentColumns = [],
    summaryConfig,
  } = options;

  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headerKeys = Object.keys(headers);
  const headerValues = Object.values(headers);
  const colWidths = computeColumnWidths(headerKeys, headerValues, data);
  const generatedAt = thaiDatetime();
  const companyName = extractCompanyName(subtitle);
  const cleanSubtitle = localizeDateRangeText(stripCompanyFromSubtitle(subtitle));

  const doc = (
    <Document
      title={title ?? filename}
      author="Sea & Hill Dashboard"
      creator="Sea & Hill Dashboard"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.topRightBlock} fixed>
          <Text
            style={styles.topRightText}
            render={({ pageNumber, totalPages }) => `หน้า : ${pageNumber}/${totalPages}`}
          />
        </View>

        <View style={styles.reportHeader} fixed>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {cleanSubtitle ? <Text style={styles.subtitle}>{cleanSubtitle}</Text> : null}
        </View>

        <View style={styles.metaRow} fixed>
          <View style={styles.metaBlockLeft}>
            <Text style={styles.metaTextBold}>ชื่อสถานประกอบการ : {companyName} </Text>
            <Text style={styles.metaText}>วันที่พิมพ์ : {generatedAt}</Text>
          </View>
        
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]} fixed>
            {headerValues.map((header, index) => (
             <View
                key={`h-${index}`}
                style={[styles.cell, { flexBasis: `${colWidths[index]}%`, flexGrow: 0 }]}
              >
                <Text style={styles.headerCellText}>{header} </Text>
              </View>
            ))}
          </View>

          {data.map((row, rowIndex) => (
            <View
              key={`r-${rowIndex}`}
              style={styles.row}
              wrap={false}
            >
              {headerKeys.map((key, colIndex) => (
                <View
                  key={`c-${rowIndex}-${colIndex}`}
                  style={[styles.cell, { flexBasis: `${colWidths[colIndex]}%`, flexGrow: 0 }]}
                >
                  <Text style={styles.cellText}>
                    {formatCellValue(row[key], key, numberColumns, currencyColumns, percentColumns)}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {summaryConfig?.columns ? (
            <View style={[styles.row, styles.summaryRow]} wrap={false}>
              {headerKeys.map((key, colIndex) => {
                const colStyle = [styles.cell, { flexBasis: `${colWidths[colIndex]}%`, flexGrow: 0 }];

                if (colIndex === 0) {
                  return (
                    <View key={`s-${key}`} style={colStyle}>
                      <Text style={styles.summaryCellText}>
                        {summaryConfig.label || 'รวมทั้งหมด'}
                      </Text>
                    </View>
                  );
                }

                if (summaryConfig.columns[key]) {
                  const summary = calculateSummary(data, key, summaryConfig.columns[key]);
                  return (
                    <View key={`s-${key}`} style={colStyle}>
                      <Text style={styles.summaryCellText}>
                        {formatCellValue(summary, key, numberColumns, currencyColumns, percentColumns)}
                      </Text>
                    </View>
                  );
                }

                return (
                  <View key={`s-${key}`} style={colStyle}>
                    <Text style={styles.summaryCellText}>-</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  saveAs(blob, `${filename}.pdf`);
}
