import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

interface EmployeeMonthlySummary {
  employee: {
    id?: string
    full_name: string
    designation?: string | null
    salary?: number | null
    branch?: { name?: string } | null
  }
  daysPresent: number
  lateDays: number
  totalLateHours: number
  earlyDays: number
  totalEarlyHours: number
  totalHoursDeducted: number
  totalDeductions: number
  baseSalary: number
  netSalary: number
}

interface ExportMonthlyPdfOptions {
  monthStr: string // e.g. "2026-08"
  branchName?: string
  summaries: EmployeeMonthlySummary[]
}

export function generateMonthlyAttendancePdf({
  monthStr,
  branchName = 'All Branches',
  summaries,
}: ExportMonthlyPdfOptions) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  // Format Month (e.g., "August 2026")
  let formattedMonth = monthStr
  try {
    const [year, m] = monthStr.split('-').map(Number)
    formattedMonth = format(new Date(year, m - 1, 1), 'MMMM yyyy')
  } catch {
    formattedMonth = monthStr
  }

  // Calculate Aggregates
  const totalEmployees = summaries.length
  const totalBaseSalary = summaries.reduce((acc, s) => acc + s.baseSalary, 0)
  const totalDeductions = summaries.reduce((acc, s) => acc + s.totalDeductions, 0)
  const totalNetSalary = summaries.reduce((acc, s) => acc + s.netSalary, 0)

  // Document Colors
  const primaryColor: [number, number, number] = [37, 99, 235] // #2563eb
  const darkTextColor: [number, number, number] = [15, 23, 42] // #0f172a
  const secondaryTextColor: [number, number, number] = [100, 116, 139] // #64748b

  // 1. Header Title Banner
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 297, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('NIRE STAFF MANAGEMENT — MONTHLY ATTENDANCE & PAYROLL REPORT', 10, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Period: ${formattedMonth}   |   Branch: ${branchName}`, 10, 18)

  doc.setFontSize(9)
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 287, 18, { align: 'right' })

  // 2. Summary Metrics Cards Section (Only Financial Totals)
  let startY = 28

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...darkTextColor)
  doc.text('MONTHLY PAYROLL OVERVIEW', 10, startY)

  startY += 3

  // Draw 4 Metric Cards: Employees, Base Payroll, Deductions, Net Payable
  const cardWidth = 66
  const cardHeight = 15
  const gap = 4
  const cardY = startY

  const metricCards = [
    { label: 'Total Employees', value: `${totalEmployees} Staff Members`, color: darkTextColor },
    { label: 'Total Base Payroll', value: `PKR ${totalBaseSalary.toLocaleString('en-PK')}`, color: darkTextColor },
    { label: 'Total Deductions', value: `- PKR ${totalDeductions.toLocaleString('en-PK')}`, color: [220, 38, 38] as [number, number, number] },
    { label: 'Net Payable Payroll', value: `PKR ${totalNetSalary.toLocaleString('en-PK')}`, color: [16, 185, 129] as [number, number, number] },
  ]

  metricCards.forEach((card, i) => {
    const x = 10 + i * (cardWidth + gap)
    doc.setFillColor(248, 250, 252) // #f8fafc
    doc.setDrawColor(226, 232, 240) // #e2e8f0
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...secondaryTextColor)
    doc.text(card.label.toUpperCase(), x + 4, cardY + 5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...card.color)
    doc.text(card.value, x + 4, cardY + 11)
  })

  startY = cardY + cardHeight + 6

  // 3. Detailed Table Headers & Rows
  const tableHeaders = [
    [
      '#',
      'Employee Name',
      'Branch',
      'Designation',
      'Present',
      'Late (Count / Hrs)',
      'Early (Count / Hrs)',
      'Base Salary (PKR)',
      'Deductions (PKR)',
      'Net Payable (PKR)',
    ],
  ]

  const tableRows = summaries.map((s, index) => [
    index + 1,
    s.employee.full_name || '—',
    s.employee.branch?.name || 'Unassigned',
    s.employee.designation || '—',
    `${s.daysPresent} days`,
    s.lateDays > 0 ? `${s.lateDays}d (${s.totalLateHours.toFixed(1)}h)` : '0d (0h)',
    s.earlyDays > 0 ? `${s.earlyDays}d (${s.totalEarlyHours.toFixed(1)}h)` : '0d (0h)',
    s.baseSalary > 0 ? s.baseSalary.toLocaleString('en-PK') : '—',
    s.totalDeductions > 0 ? `- ${s.totalDeductions.toLocaleString('en-PK')}` : '0',
    s.netSalary > 0 ? s.netSalary.toLocaleString('en-PK') : '0',
  ])

  // Total Summary Row (ONLY Base Salary, Deductions, and Net Payable)
  tableRows.push([
    '',
    'TOTAL SUMMARY',
    '',
    '',
    '—',
    '—',
    '—',
    totalBaseSalary.toLocaleString('en-PK'),
    `- ${totalDeductions.toLocaleString('en-PK')}`,
    totalNetSalary.toLocaleString('en-PK'),
  ])

  autoTable(doc, {
    startY: startY,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' }, // #
      1: { cellWidth: 42, fontStyle: 'bold' }, // Name
      2: { cellWidth: 28 }, // Branch
      3: { cellWidth: 30 }, // Designation
      4: { cellWidth: 20, halign: 'center' }, // Present
      5: { cellWidth: 30, halign: 'center' }, // Late
      6: { cellWidth: 30, halign: 'center' }, // Early
      7: { cellWidth: 30, halign: 'right' }, // Base Salary
      8: { cellWidth: 28, halign: 'right', textColor: [220, 38, 38] }, // Deductions (Red)
      9: { cellWidth: 31, halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }, // Net Salary (Green)
    },
    didParseCell: (data) => {
      // Style the total summary row at the bottom
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [241, 245, 249]
        data.cell.styles.textColor = [15, 23, 42]
      }
    },
    margin: { top: 12, left: 10, right: 10, bottom: 12 },
  })

  // 4. Page Numbers Footer
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Page ${i} of ${totalPages}   •   Nire Staff Management System   •   Confidential Report`,
      148.5,
      202,
      { align: 'center' }
    )
  }

  // Save the PDF file
  const fileName = `Nire_Monthly_Attendance_${monthStr.replace('-', '_')}_${branchName.replace(/\s+/g, '_')}.pdf`
  doc.save(fileName)
}
