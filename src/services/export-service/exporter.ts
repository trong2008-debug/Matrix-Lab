import { jsPDF } from 'jspdf';
import { CalculationReport, MatrixDisplayData } from '@/src/types/math';

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'matrixlab_ket_qua';
}

export function formatMatrixPlainText(m: MatrixDisplayData): string {
  const colWidths = Array.from({ length: m.cols }, (_, c) =>
    Math.max(...m.entries.map((row) => (row[c] ?? '').length), 1)
  );
  return m.entries
    .map((row) => '[ ' + row.map((cell, c) => cell.padStart(colWidths[c], ' ')).join('  ') + ' ]')
    .join('\n');
}

export function exportReportToLatex(report: CalculationReport): string {
  const lines: string[] = [
    `% MatrixLab — Báo cáo tính toán Đại số tuyến tính`,
    `% Phép toán: ${report.operationName}`,
    `% Thuật toán: ${report.algorithmName}`,
    ``,
    `\\section*{${report.operationName}}`,
    `\\textbf{Thuật toán:} ${report.algorithmName} \\\\`,
    `\\textbf{Chế độ:} ${report.isExactResult ? 'Số học phân số chính xác' : 'Xấp xỉ số học dấu phẩy động'}`,
    ``,
    `\\subsection*{Dữ liệu đầu vào}`,
    ...report.inputMatrices.map((m) => `\\[\n${m.name} = ${m.display.latex}\n\\]`),
  ];

  if (report.steps.length > 0) {
    lines.push(`\\subsection*{Các bước biến đổi}`);
    for (const s of report.steps) {
      lines.push(`\\paragraph{Bước ${s.stepNumber}: ${s.stage}}`);
      lines.push(s.explanation);
      if (s.operationNotation) {
        lines.push(`\\[\n${s.operationNotation}\n\\]`);
      }
      if (s.matrixAfter) {
        lines.push(`\\[\n${s.matrixAfter.latex}\n\\]`);
      }
    }
  }

  lines.push(`\\subsection*{Kết quả cuối cùng}`);
  lines.push(`\\[\n${report.resultLatex}\n\\]`);
  if (report.secondaryMatrices && report.secondaryMatrices.length > 0) {
    for (const sec of report.secondaryMatrices) {
      lines.push(`\\[\n${sec.symbol} = ${sec.matrix.latex}\n\\]`);
    }
  }
  lines.push(`\\textbf{Kết luận:} ${report.conclusion}`);
  return lines.join('\n');
}

export function exportReportToMarkdown(report: CalculationReport): string {
  const lines: string[] = [
    `# ${report.operationName}`,
    ``,
    `- **Thuật toán:** ${report.algorithmName}`,
    `- **Chế độ:** ${report.isExactResult ? 'Phân số chính xác' : 'Xấp xỉ số học'}`,
    `- **Ngày tạo:** ${new Date().toLocaleString('vi-VN')}`,
    ``,
    `## Dữ liệu đầu vào`,
    ...report.inputMatrices.map((m) => `$$${m.name} = ${m.display.latex}$$`),
    ``,
    `## Điều kiện áp dụng`,
    ...report.conditionsCheck.items.map(
      (c) => `- [${c.satisfied ? 'x' : ' '}] **${c.label}:** ${c.detail}`
    ),
    ``,
  ];

  if (report.steps.length > 0) {
    lines.push(`## Các bước biến đổi`);
    for (const s of report.steps) {
      lines.push(`### Bước ${s.stepNumber}: ${s.stage}`);
      lines.push(s.explanation);
      if (s.operationNotation) lines.push(`$$${s.operationNotation}$$`);
      if (s.formulaLatex) lines.push(`$$${s.formulaLatex}$$`);
      if (s.matrixAfter) lines.push(`$$${s.matrixAfter.latex}$$`);
      lines.push('');
    }
  }

  lines.push(`## Kết quả cuối cùng`);
  lines.push(`**${report.resultTitle}**`);
  lines.push(`$$${report.resultLatex}$$`);
  if (report.verification) {
    lines.push(`## Kiểm tra kết quả`);
    lines.push(`- **${report.verification.label}:** ${report.verification.detail}`);
  }
  lines.push(`## Kết luận`);
  lines.push(report.conclusion);
  return lines.join('\n');
}

export function exportReportToPlainText(report: CalculationReport): string {
  const lines: string[] = [
    `MATRIXLAB — KHÔNG GIAN TÍNH TOÁN ĐẠI SỐ TUYẾN TÍNH`,
    `==================================================`,
    `Phép toán: ${report.operationName}`,
    `Thuật toán: ${report.algorithmName}`,
    `Chế độ: ${report.isExactResult ? 'Phân số chính xác' : 'Xấp xỉ số học'}`,
    `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`,
    ``,
    `1. DỮ LIỆU ĐẦU VÀO`,
    ...report.inputMatrices.map((m) => `${m.name} (${m.rows}×${m.cols}):\n${formatMatrixPlainText(m.display)}`),
    ``,
    `2. ĐIỀU KIỆN ÁP DỤNG`,
    ...report.conditionsCheck.items.map((c) => `[${c.satisfied ? 'ĐẠT' : 'KHÔNG ĐẠT'}] ${c.label}: ${c.detail}`),
    ``,
  ];

  if (report.steps.length > 0) {
    lines.push(`3. CÁC BƯỚC BIẾN ĐỔI`);
    for (const s of report.steps) {
      lines.push(`- Bước ${s.stepNumber} (${s.stage}): ${s.explanation}`);
      if (s.matrixAfter) {
        lines.push(formatMatrixPlainText(s.matrixAfter));
      }
    }
    lines.push('');
  }

  lines.push(`4. KẾT QUẢ CUỐI CÙNG`);
  lines.push(report.resultTitle);
  lines.push(report.resultText);
  if (report.resultMatrix) {
    lines.push(formatMatrixPlainText(report.resultMatrix));
  }
  if (report.secondaryMatrices) {
    for (const sec of report.secondaryMatrices) {
      lines.push(`\n${sec.label}:`);
      lines.push(formatMatrixPlainText(sec.matrix));
    }
  }
  lines.push('');
  if (report.verification) {
    lines.push(`5. KIỂM TRA KẾT QUẢ`);
    lines.push(`${report.verification.label}: ${report.verification.detail}`);
    lines.push('');
  }
  lines.push(`6. KẾT LUẬN`);
  lines.push(report.conclusion);
  return lines.join('\n');
}

export function exportReportToCsv(report: CalculationReport): string {
  const targetMatrix =
    report.resultMatrix ??
    report.secondaryMatrices?.[0]?.matrix ??
    report.inputMatrices[0]?.display;

  if (!targetMatrix) {
    return `"Phép toán","Kết quả"\n"${report.operationName}","${report.resultText.replace(/"/g, '""')}"`;
  }

  const lines: string[] = [];
  for (const row of targetMatrix.entries) {
    lines.push(row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','));
  }
  return lines.join('\n');
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * High-DPI Canvas-to-PDF mathematical document renderer.
 * Uses native browser Canvas text engine so 100% of Vietnamese diacritics and
 * crisp vector matrix brackets render reliably without Tailwind oklch parsing issues.
 */
export function exportReportToPdf(report: CalculationReport): void {
  const A4_W_PX = 1240; // ~150 DPI A4 width
  const A4_H_PX = 1754; // ~150 DPI A4 height
  const MARGIN_X = 88;
  const MARGIN_TOP = 90;
  const MARGIN_BOTTOM = 85;
  const CONTENT_W = A4_W_PX - 2 * MARGIN_X;

  const pages: HTMLCanvasElement[] = [];

  const createPage = (): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; y: number } => {
    const canvas = document.createElement('canvas');
    canvas.width = A4_W_PX;
    canvas.height = A4_H_PX;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, A4_W_PX, A4_H_PX);
    pages.push(canvas);
    return { canvas, ctx, y: MARGIN_TOP };
  };

  let cur = createPage();

  const ensureSpace = (neededHeight: number) => {
    if (cur.y + neededHeight > A4_H_PX - MARGIN_BOTTOM) {
      cur = createPage();
    }
  };

  const drawWrappedText = (
    text: string,
    x: number,
    maxW: number,
    font: string,
    color: string,
    lineHeight: number
  ) => {
    cur.ctx.font = font;
    cur.ctx.fillStyle = color;
    const paragraphs = text.split('\n');
    for (const para of paragraphs) {
      const words = para.split(/\s+/);
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (cur.ctx.measureText(test).width > maxW && line) {
          ensureSpace(lineHeight);
          cur.ctx.font = font;
          cur.ctx.fillStyle = color;
          cur.ctx.fillText(line, x, cur.y);
          cur.y += lineHeight;
          line = word;
        } else {
          line = test;
        }
      }
      if (line || para === '') {
        ensureSpace(lineHeight);
        cur.ctx.font = font;
        cur.ctx.fillStyle = color;
        cur.ctx.fillText(line, x, cur.y);
        cur.y += lineHeight;
      }
    }
  };

  const drawMatrixBlock = (label: string, m: MatrixDisplayData) => {
    const cellH = 34;
    const padY = 12;
    const totalH = m.rows * cellH + padY * 2 + 34;
    ensureSpace(Math.min(totalH, 600));

    cur.ctx.font = '600 20px "Plus Jakarta Sans", Arial, sans-serif';
    cur.ctx.fillStyle = '#17191F';
    cur.ctx.fillText(label, MARGIN_X, cur.y);
    cur.y += 28;

    const colWidths = Array.from({ length: m.cols }, (_, c) => {
      cur.ctx.font = '500 19px "JetBrains Mono", monospace';
      const maxW = Math.max(
        ...m.entries.map((row) => cur.ctx.measureText(row[c] ?? '').width),
        36
      );
      return Math.min(maxW + 24, 150);
    });

    const matrixW = Math.min(
      colWidths.reduce((a, b) => a + b, 0) + 32,
      CONTENT_W
    );
    const boxH = m.rows * cellH + padY * 2;
    const x0 = MARGIN_X + 8;
    const y0 = cur.y;

    // Brackets
    cur.ctx.strokeStyle = '#17191F';
    cur.ctx.lineWidth = 2.5;
    // Left bracket
    cur.ctx.beginPath();
    cur.ctx.moveTo(x0 + 10, y0);
    cur.ctx.lineTo(x0, y0);
    cur.ctx.lineTo(x0, y0 + boxH);
    cur.ctx.lineTo(x0 + 10, y0 + boxH);
    cur.ctx.stroke();
    // Right bracket
    cur.ctx.beginPath();
    cur.ctx.moveTo(x0 + matrixW - 10, y0);
    cur.ctx.lineTo(x0 + matrixW, y0);
    cur.ctx.lineTo(x0 + matrixW, y0 + boxH);
    cur.ctx.lineTo(x0 + matrixW - 10, y0 + boxH);
    cur.ctx.stroke();

    // Entries
    cur.ctx.font = '500 18px "JetBrains Mono", monospace';
    cur.ctx.fillStyle = '#17191F';
    for (let r = 0; r < m.rows; r++) {
      let cx = x0 + 16;
      for (let c = 0; c < m.cols; c++) {
        if (m.augmentedSplitCol && c === m.augmentedSplitCol) {
          cur.ctx.strokeStyle = '#9CA3AF';
          cur.ctx.lineWidth = 1.5;
          cur.ctx.beginPath();
          cur.ctx.moveTo(cx - 6, y0 + 8);
          cur.ctx.lineTo(cx - 6, y0 + boxH - 8);
          cur.ctx.stroke();
          cx += 8;
        }
        const txt = m.entries[r][c] ?? '';
        const w = colWidths[c];
        const tw = cur.ctx.measureText(txt).width;
        cur.ctx.fillStyle = '#17191F';
        cur.ctx.fillText(txt, cx + Math.max(0, (w - tw) / 2 - 4), y0 + padY + r * cellH + 22);
        cx += w;
      }
    }

    cur.y += boxH + 22;
  };

  // Document Header
  cur.ctx.font = '700 28px "Plus Jakarta Sans", Arial, sans-serif';
  cur.ctx.fillStyle = '#2563EB';
  cur.ctx.fillText('MatrixLab', MARGIN_X, cur.y);

  cur.ctx.font = '400 17px "DM Sans", Arial, sans-serif';
  cur.ctx.fillStyle = '#697386';
  const dateStr = new Date().toLocaleString('vi-VN');
  const dateW = cur.ctx.measureText(dateStr).width;
  cur.ctx.fillText(dateStr, A4_W_PX - MARGIN_X - dateW, cur.y);
  cur.y += 18;

  cur.ctx.strokeStyle = '#E5E7EB';
  cur.ctx.lineWidth = 2;
  cur.ctx.beginPath();
  cur.ctx.moveTo(MARGIN_X, cur.y);
  cur.ctx.lineTo(A4_W_PX - MARGIN_X, cur.y);
  cur.y += 38;

  // Title & Metadata
  drawWrappedText(
    report.operationName,
    MARGIN_X,
    CONTENT_W,
    '700 28px "Plus Jakarta Sans", Arial, sans-serif',
    '#17191F',
    36
  );
  drawWrappedText(
    `Thuật toán: ${report.algorithmName}  ·  Chế độ: ${report.isExactResult ? 'Phân số chính xác' : 'Xấp xỉ số học'}`,
    MARGIN_X,
    CONTENT_W,
    '400 18px "DM Sans", Arial, sans-serif',
    '#697386',
    28
  );
  cur.y += 14;

  // Section 1: Inputs
  drawWrappedText('1. Dữ liệu đầu vào', MARGIN_X, CONTENT_W, '700 22px "Plus Jakarta Sans", Arial, sans-serif', '#17191F', 30);
  for (const m of report.inputMatrices) {
    drawMatrixBlock(`Ma trận ${m.name} (${m.rows} × ${m.cols}):`, m.display);
  }

  // Section 2: Conditions
  drawWrappedText('2. Điều kiện áp dụng', MARGIN_X, CONTENT_W, '700 22px "Plus Jakarta Sans", Arial, sans-serif', '#17191F', 30);
  for (const cond of report.conditionsCheck.items) {
    drawWrappedText(
      `• [${cond.satisfied ? 'Đạt' : 'Không đạt'}] ${cond.label}: ${cond.detail}`,
      MARGIN_X + 12,
      CONTENT_W - 12,
      '400 18px "DM Sans", Arial, sans-serif',
      cond.satisfied ? '#17191F' : '#DC2626',
      26
    );
  }
  cur.y += 10;

  // Section 3: Steps (capped to keep PDF readable if massive)
  if (report.steps.length > 0) {
    drawWrappedText('3. Các bước biến đổi', MARGIN_X, CONTENT_W, '700 22px "Plus Jakarta Sans", Arial, sans-serif', '#17191F', 30);
    const maxPdfSteps = 18;
    for (const s of report.steps.slice(0, maxPdfSteps)) {
      drawWrappedText(
        `Bước ${s.stepNumber} (${s.stage}): ${s.explanation}`,
        MARGIN_X + 10,
        CONTENT_W - 10,
        '400 18px "DM Sans", Arial, sans-serif',
        '#17191F',
        26
      );
      if (s.matrixAfter && s.matrixAfter.rows <= 6 && s.matrixAfter.cols <= 8) {
        drawMatrixBlock(`Ma trận sau bước ${s.stepNumber}:`, s.matrixAfter);
      }
    }
    if (report.steps.length > maxPdfSteps) {
      drawWrappedText(
        `... (${report.steps.length - maxPdfSteps} bước trung gian tiếp theo được rút gọn trong bản in PDF)`,
        MARGIN_X + 10,
        CONTENT_W - 10,
        '400 17px "DM Sans", Arial, sans-serif',
        '#697386',
        24
      );
    }
    cur.y += 10;
  }

  // Section 4: Result
  drawWrappedText('4. Kết quả cuối cùng', MARGIN_X, CONTENT_W, '700 22px "Plus Jakarta Sans", Arial, sans-serif', '#17191F', 30);
  drawWrappedText(report.resultTitle, MARGIN_X + 10, CONTENT_W - 10, '600 20px "Plus Jakarta Sans", Arial, sans-serif', '#15803D', 28);
  if (report.resultMatrix) {
    drawMatrixBlock('Ma trận kết quả:', report.resultMatrix);
  } else {
    drawWrappedText(report.resultText, MARGIN_X + 10, CONTENT_W - 10, '500 18px "JetBrains Mono", monospace', '#17191F', 26);
  }
  if (report.secondaryMatrices) {
    for (const sec of report.secondaryMatrices) {
      drawMatrixBlock(`${sec.label}:`, sec.matrix);
    }
  }

  if (report.verification) {
    cur.y += 8;
    drawWrappedText('5. Kiểm tra kết quả', MARGIN_X, CONTENT_W, '700 22px "Plus Jakarta Sans", Arial, sans-serif', '#17191F', 30);
    drawWrappedText(`${report.verification.label}: ${report.verification.detail}`, MARGIN_X + 10, CONTENT_W - 10, '400 18px "DM Sans", Arial, sans-serif', '#17191F', 26);
  }

  cur.y += 8;
  drawWrappedText('6. Kết luận', MARGIN_X, CONTENT_W, '700 22px "Plus Jakarta Sans", Arial, sans-serif', '#17191F', 30);
  drawWrappedText(report.conclusion, MARGIN_X + 10, CONTENT_W - 10, '400 18px "DM Sans", Arial, sans-serif', '#17191F', 26);

  // Page footers
  pages.forEach((canvas, idx) => {
    const ctx = canvas.getContext('2d')!;
    ctx.font = '400 15px "DM Sans", Arial, sans-serif';
    ctx.fillStyle = '#929BAA';
    ctx.fillText(
      `MatrixLab — Không gian tính toán Đại số tuyến tính`,
      MARGIN_X,
      A4_H_PX - 38
    );
    const pageTxt = `Trang ${idx + 1} / ${pages.length}`;
    const pw = ctx.measureText(pageTxt).width;
    ctx.fillText(pageTxt, A4_W_PX - MARGIN_X - pw, A4_H_PX - 38);
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  pages.forEach((canvas, idx) => {
    if (idx > 0) pdf.addPage();
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
  });

  const fileSlug = sanitizeFilename(report.operationName);
  pdf.save(`matrixlab_${fileSlug}.pdf`);
}
