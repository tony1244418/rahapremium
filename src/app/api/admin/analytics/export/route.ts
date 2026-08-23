import { NextResponse, type NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { getDetailedAnalytics, type DetailedAnalytics } from '@/lib/admin';
import { verifyAdminRequest } from '@/lib/adminAuth';

const QUICKCHART_URL = process.env.QUICKCHART_URL || 'https://quickchart.io/chart';
const QUICKCHART_TIMEOUT_MS = 6500;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLORS = {
  primary: 'FF312E81',
  secondary: 'FF4338CA',
  accent: 'FF6366F1',
  success: 'FF16A34A',
  info: 'FF2563EB',
  warning: 'FFF59E0B',
  danger: 'FFDC2626',
  neutralDark: 'FF111827',
  neutral: 'FF4B5563',
  neutralMuted: 'FF9CA3AF',
  neutralLight: 'FFF3F4F6',
};

async function generateChartBase64(chart: Record<string, any>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUICKCHART_TIMEOUT_MS);

  try {
    const response = await fetch(QUICKCHART_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        width: 900,
        height: 480,
        format: 'png',
        backgroundColor: 'white',
        chart,
      }),
    });

    if (!response.ok) {
      throw new Error(`QuickChart error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    if (!base64 || base64.length < 16) {
      throw new Error('QuickChart returned empty image');
    }
    return base64;
  } catch (error) {
    console.error('Chart generation error:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function styleHeader(row: ExcelJS.Row, fgColor: string) {
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgColor } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1F2937' } },
      left: { style: 'thin', color: { argb: 'FF1F2937' } },
      bottom: { style: 'thin', color: { argb: 'FF1F2937' } },
      right: { style: 'thin', color: { argb: 'FF1F2937' } },
    };
  });
}

function addSectionTitle(sheet: ExcelJS.Worksheet, range: string, title: string, color: string) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(':')[0]);
  cell.value = title;
  cell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
}

function addTable(
  sheet: ExcelJS.Worksheet,
  name: string,
  ref: string,
  headers: { name: string }[],
  rows: (string | number)[][],
) {
  sheet.addTable({
    name,
    ref,
    headerRow: true,
    style: {
      theme: 'TableStyleMedium9',
      showRowStripes: true,
      showColumnStripes: false,
    },
    columns: headers,
    rows,
  });
}

async function buildWorkbook(analytics: DetailedAnalytics, includeCharts = true) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RahaPremium Analytics';
  workbook.created = new Date();

  // Sheet 1: KPI Overview
  const overview = workbook.addWorksheet('01_KPI_Overview', {
    properties: { tabColor: { argb: COLORS.primary } },
    views: [{ state: 'frozen', ySplit: 6 }],
  });
  overview.columns = [
    { width: 32 },
    { width: 28 },
    { width: 45 },
    { width: 28 },
    { width: 28 },
    { width: 40 },
  ];

  addSectionTitle(overview, 'A1:F1', 'RahaPremium KPI Snapshot', COLORS.primary);
  overview.getCell('A2').value = `Generated on ${new Date().toLocaleString()}`;
  overview.getCell('A2').font = { italic: true, color: { argb: COLORS.neutralMuted } };

  const kpiCards: [string, string | number, string, string][] = [
    ['Total Revenue', `TSH ${analytics.totalRevenue.toLocaleString()}`, 'Cumulative revenue generated to date', COLORS.success],
    ['Monthly Revenue', `TSH ${analytics.monthlyRevenue.toLocaleString()}`, 'Revenue generated this month', COLORS.accent],
    ['Weekly Revenue', `TSH ${analytics.weeklyRevenue.toLocaleString()}`, 'Revenue generated this week', COLORS.info],
    ['Daily Revenue', `TSH ${analytics.dailyRevenue.toLocaleString()}`, 'Revenue generated in the last 24 hours', COLORS.warning],
    ['Total Users', analytics.totalUsers, 'Registered user accounts', COLORS.accent],
    ['Active Subscriptions', analytics.activeSubscriptions, 'Users with an active paid plan', COLORS.success],
    ['Payment Success Rate', `${analytics.successRate.toFixed(1)}%`, 'Completed payments vs attempts', COLORS.success],
    ['Pending Payments', analytics.pendingPayments, 'Payments awaiting confirmation', COLORS.warning],
    ['Blocked Users', analytics.blockedUsers, 'Users flagged for review', COLORS.danger],
  ];

  let kpiRow = 4;
  kpiCards.forEach(([label, value, description, color]) => {
    const row = overview.getRow(kpiRow++);
    row.getCell(1).value = label;
    row.getCell(2).value = value;
    row.getCell(3).value = description;
    row.eachCell((cell, colNumber) => {
      cell.font = {
        bold: colNumber === 2,
        size: colNumber === 2 ? 14 : 11,
        color: { argb: colNumber === 2 ? 'FFFFFFFF' : COLORS.neutralDark },
      };
      cell.alignment = { horizontal: colNumber === 3 ? 'left' : 'center', vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colNumber === 2 ? color : COLORS.neutralLight },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  });

  // Sheet 2: Trend Dashboard
  const trendsSheet = workbook.addWorksheet('02_Trends', {
    properties: { tabColor: { argb: COLORS.accent } },
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  trendsSheet.columns = Array.from({ length: 12 }, () => ({ width: 18 }));
  addSectionTitle(trendsSheet, 'A1:L1', 'Trend Dashboard', COLORS.accent);

  const chartConfigs = [
    {
      title: 'Revenue Trend (Last 7 Days)',
      config: {
        type: 'line',
        data: {
          labels: analytics.dailyRevenueLast7Days.map((item) => item.date),
          datasets: [{
            label: 'Daily Revenue (TSH)',
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.15)',
            data: analytics.dailyRevenueLast7Days.map((item) => item.revenue),
            borderWidth: 3,
            fill: true,
            tension: 0.35,
          }],
        },
      },
    },
    {
      title: 'New Users (Last 7 Days)',
      config: {
        type: 'line',
        data: {
          labels: analytics.dailyUsersLast7Days.map((item) => item.date),
          datasets: [{
            label: 'New Users',
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.15)',
            data: analytics.dailyUsersLast7Days.map((item) => item.users),
            borderWidth: 3,
            fill: true,
            tension: 0.35,
          }],
        },
      },
    },
    {
      title: 'Payment Outcomes (Last 7 Days)',
      config: {
        type: 'bar',
        data: {
          labels: analytics.dailyPaymentsLast7Days.map((item) => item.date),
          datasets: [
            {
              label: 'Completed',
              backgroundColor: '#22c55e',
              data: analytics.dailyPaymentsLast7Days.map((item) => item.completed),
            },
            {
              label: 'Failed',
              backgroundColor: '#ef4444',
              data: analytics.dailyPaymentsLast7Days.map((item) => item.failed),
            },
          ],
        },
      },
    },
    {
      title: 'Package Revenue Distribution',
      config: {
        type: 'bar',
        data: {
          labels: Object.keys(analytics.revenueByPackage),
          datasets: [{
            label: 'Revenue by Package (TSH)',
            backgroundColor: ['#f59e0b', '#6b7280', '#fbbf24', '#3b82f6', '#8b5cf6'],
            data: Object.values(analytics.revenueByPackage),
          }],
        },
      },
    },
  ];

  const chartResults = includeCharts
    ? await Promise.allSettled(chartConfigs.map(({ config }) => generateChartBase64(config)))
    : [];

  chartConfigs.forEach(({ title }, index) => {
    const startRow = index < 2 ? 3 : 23;
    const startCol = index % 2 === 0 ? 0 : 6;
    trendsSheet.getCell(startRow, startCol + 1).value = title;
    trendsSheet.getCell(startRow, startCol + 1).font = { bold: true, size: 13, color: { argb: COLORS.neutralDark } };

    const chartResult = chartResults[index];
    const base64Image = chartResult && chartResult.status === 'fulfilled' ? chartResult.value : null;

    if (base64Image) {
      const imageId = workbook.addImage({ base64: base64Image, extension: 'png' });
      trendsSheet.addImage(imageId, {
        tl: { col: startCol, row: startRow + 1 },
        ext: { width: 560, height: 300 },
      });
    } else {
      trendsSheet.mergeCells(startRow + 1, startCol + 1, startRow + 15, startCol + 6);
      const fallback = trendsSheet.getCell(startRow + 1, startCol + 1);
      fallback.value = includeCharts
        ? 'Chart unavailable (QuickChart timeout or error).'
        : 'Charts disabled for this export.';
      fallback.font = { italic: true, color: { argb: COLORS.danger } };
      fallback.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }
  });

  // Sheet 3: Revenue Data
  const revenueSheet = workbook.addWorksheet('03_Revenue_Data', {
    properties: { tabColor: { argb: COLORS.success } },
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  revenueSheet.columns = [
    { header: 'Date', key: 'date', width: 18 },
    { header: 'Daily Revenue (TSH)', key: 'revenue', width: 22 },
  ];
  styleHeader(revenueSheet.getRow(1), COLORS.success);
  analytics.dailyRevenueLast7Days.forEach((record) => {
    const row = revenueSheet.addRow({ date: record.date, revenue: record.revenue });
    row.getCell('revenue').numFmt = '"TSH" #,##0';
  });
  revenueSheet.addRow([]);
  revenueSheet
    .addRow(['Total 7-day Revenue', analytics.dailyRevenueLast7Days.reduce((sum, item) => sum + item.revenue, 0)])
    .getCell(2).numFmt = '"TSH" #,##0';

  // Sheet 4: User Metrics
  const userSheet = workbook.addWorksheet('04_User_Metrics', {
    properties: { tabColor: { argb: COLORS.info } },
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  userSheet.columns = [
    { header: 'Date', key: 'date', width: 18 },
    { header: 'New Users', key: 'users', width: 18 },
  ];
  styleHeader(userSheet.getRow(1), COLORS.info);
  analytics.dailyUsersLast7Days.forEach((record) => {
    userSheet.addRow({ date: record.date, users: record.users });
  });
  userSheet.addRow([]);
  const subSummaryStart = userSheet.lastRow!.number + 2;
  userSheet.getCell(`A${subSummaryStart}`).value = 'Subscription Status Snapshot';
  userSheet.getCell(`A${subSummaryStart}`).font = { bold: true, size: 13, color: { argb: COLORS.neutralDark } };
  addTable(
    userSheet,
    'SubscriptionSummary',
    `A${subSummaryStart + 1}`,
    [
      { name: 'Status' },
      { name: 'Users' },
      { name: 'Insight' },
    ],
    [
      ['With Active Subscription', analytics.usersWithSubscription, 'Currently enjoying premium access'],
      ['Without Active Subscription', analytics.usersWithoutSubscription, 'Great targets for upsell campaigns'],
    ],
  );

  // Sheet 5: Payment Metrics
  const paymentSheet = workbook.addWorksheet('05_Payment_Metrics', {
    properties: { tabColor: { argb: COLORS.danger } },
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  paymentSheet.columns = [
    { header: 'Date', key: 'date', width: 18 },
    { header: 'Completed', key: 'completed', width: 15 },
    { header: 'Failed', key: 'failed', width: 15 },
  ];
  styleHeader(paymentSheet.getRow(1), COLORS.danger);
  analytics.dailyPaymentsLast7Days.forEach((record) => {
    paymentSheet.addRow({ date: record.date, completed: record.completed, failed: record.failed });
  });
  paymentSheet.addRow([]);
  addTable(
    paymentSheet,
    'PaymentSummary',
    `A${paymentSheet.lastRow!.number + 2}`,
    [
      { name: 'Metric' },
      { name: 'Value' },
      { name: 'Description' },
    ],
    [
      ['Total Payments Recorded', analytics.totalPayments, 'All attempts (completed + failed + cancelled)'],
      ['Completed Payments', analytics.completedPayments, 'Successful transactions'],
      ['Failed Payments', analytics.failedPayments, 'Failures due to user/provider issues'],
      ['Cancelled Payments', analytics.cancelledPayments, 'Cancelled during processing'],
      ['Payment Success Rate', `${analytics.successRate.toFixed(1)}%`, 'Efficiency of the payment pipeline'],
    ],
  );

  // Sheet 6: Package Performance
  const packageSheet = workbook.addWorksheet('06_Package_Performance', {
    properties: { tabColor: { argb: COLORS.warning } },
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  packageSheet.columns = [
    { header: 'Package', key: 'package', width: 18 },
    { header: 'Active Subscriptions', key: 'active', width: 22 },
    { header: 'Revenue (TSH)', key: 'revenue', width: 22 },
    { header: 'Share of Revenue', key: 'share', width: 20 },
  ];
  styleHeader(packageSheet.getRow(1), COLORS.warning);
  const totalPackageRevenue = Object.values(analytics.revenueByPackage).reduce((sum, val) => sum + val, 0);
  Object.entries(analytics.subscriptionsByPackage).forEach(([pkg, active]) => {
    const revenue = analytics.revenueByPackage[pkg as keyof typeof analytics.revenueByPackage] || 0;
    const share = totalPackageRevenue > 0 ? `${((revenue / totalPackageRevenue) * 100).toFixed(1)}%` : '0%';
    const row = packageSheet.addRow({ package: pkg, active, revenue, share });
    row.getCell('revenue').numFmt = '"TSH" #,##0';
  });
  packageSheet.addRow([]);
  packageSheet.addRow(['Total Revenue', '', totalPackageRevenue, '']).getCell(3).numFmt = '"TSH" #,##0';

  // Sheet 7: Content & System Status
  const contentSheet = workbook.addWorksheet('07_Content_System', {
    properties: { tabColor: { argb: COLORS.secondary } },
  });
  addSectionTitle(contentSheet, 'A1:C1', 'Content Catalogue Overview', COLORS.secondary);
  addTable(
    contentSheet,
    'ContentSummary',
    'A2',
    [
      { name: 'Content Type' },
      { name: 'Total Count' },
      { name: 'Notes' },
    ],
    [
      ['Movies', analytics.totalMovies, 'Available movie titles'],
      ['TV Series', analytics.totalSeries, 'Series with seasons & episodes'],
      ['Stories', analytics.totalStories, 'Text-based story content'],
    ],
  );
  const systemStart = contentSheet.lastRow!.number + 3;
  addSectionTitle(contentSheet, `A${systemStart}:C${systemStart}`, 'System Health Snapshot', COLORS.primary);
  addTable(
    contentSheet,
    'SystemStatus',
    `A${systemStart + 1}`,
    [
      { name: 'Metric' },
      { name: 'Value' },
      { name: 'Operational Note' },
    ],
    [
      ['Pending Payments', analytics.pendingPayments, 'Monitor and nudge users if stuck'],
      ['Blocked Users', analytics.blockedUsers, 'Requires follow-up for reactivation'],
    ],
  );

  return workbook.xlsx.writeBuffer();
}

function buildDownloadResponse(buffer: ArrayBuffer) {
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=raha-analytics-dashboard-${new Date()
        .toISOString()
        .split('T')[0]}.xlsx`,
      'Content-Length': String(buffer.byteLength),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authError = await verifyAdminRequest(req);
    if (authError) return authError;

    const body = (await req.json().catch(() => null)) as { analytics?: DetailedAnalytics; includeCharts?: boolean } | null;
    if (!body?.analytics) {
      return NextResponse.json(
        { success: false, message: 'Analytics payload missing. Provide analytics data in the request body.' },
        { status: 400 },
      );
    }

    const fileBuffer = await buildWorkbook(body.analytics, body.includeCharts !== false);
    return buildDownloadResponse(fileBuffer);
  } catch (error) {
    console.error('Analytics export error (POST):', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate analytics export.' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authError = await verifyAdminRequest(req);
    if (authError) return authError;

    const analytics = await getDetailedAnalytics();
    const includeCharts = req.nextUrl.searchParams.get('charts') !== '0';
    const fileBuffer = await buildWorkbook(analytics, includeCharts);
    return buildDownloadResponse(fileBuffer);
  } catch (error) {
    console.error('Analytics export error (GET):', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate analytics export.' },
      { status: 500 },
    );
  }
}
