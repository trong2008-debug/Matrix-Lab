import React, { useState } from 'react';
import {
  AlertTriangle,
  BookmarkPlus,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  Info,
  XCircle,
} from 'lucide-react';
import {
  CalculationReport,
  SolutionDisplayMode,
  StructuredMathError,
} from '@/src/types/math';
import { MathFormula } from '@/src/components/math-renderer/MathFormula';
import { StepViewer } from '@/src/components/step-viewer/StepViewer';
import { useMatrixLabStore } from '@/src/store/useMatrixLabStore';
import {
  downloadTextFile,
  exportReportToCsv,
  exportReportToLatex,
  exportReportToMarkdown,
  exportReportToPdf,
  exportReportToPlainText,
} from '@/src/services/export-service/exporter';
import { vi } from '@/src/locales/vi';

interface ResultPanelProps {
  report: CalculationReport | null;
  error: StructuredMathError | null;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({ report, error }) => {
  const { settings, saveCurrentToHistory, showToast } = useMatrixLabStore();
  const [displayMode, setDisplayMode] = useState<SolutionDisplayMode>(settings.defaultDisplayMode);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-[#DC2626]/40 bg-red-50/70 p-5 dark:border-[#F87171]/40 dark:bg-red-950/20"
      >
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 shrink-0 text-[#DC2626] dark:text-[#F87171] mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[#DC2626] dark:text-[#F87171]">
              Không thể thực hiện phép tính
            </h3>
            <p className="text-sm text-[#17191F] dark:text-[#F3F4F6]">{error.message}</p>
            {error.detail && (
              <p className="text-xs text-[#697386] dark:text-[#9CA3AF]">{error.detail}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] bg-white px-6 py-14 text-center dark:border-[#303642] dark:bg-[#191C23]">
        <div className="mb-3 rounded-lg bg-[#F1F3F7] p-3 text-[#697386] dark:bg-[#20242D] dark:text-[#9CA3AF]">
          <Info className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold text-[#17191F] dark:text-[#F3F4F6]">
          {vi.emptyStates.noResultTitle}
        </h3>
        <p className="mt-1.5 max-w-md text-sm text-[#697386] dark:text-[#9CA3AF]">
          {vi.emptyStates.noResultDesc}
        </p>
      </div>
    );
  }

  const handleCopy = async (format: 'latex' | 'text' | 'csv' | 'markdown') => {
    setShowCopyMenu(false);
    let content = '';
    let toastMsg: string = vi.notifications.copiedText;
    if (format === 'latex') {
      content = report.resultLatex;
      toastMsg = vi.notifications.copiedLatex;
    } else if (format === 'csv') {
      content = exportReportToCsv(report);
      toastMsg = vi.notifications.copiedCsv;
    } else if (format === 'markdown') {
      content = exportReportToMarkdown(report);
      toastMsg = vi.notifications.copiedMarkdown;
    } else {
      content = exportReportToPlainText(report);
      toastMsg = vi.notifications.copiedText;
    }
    try {
      await navigator.clipboard.writeText(content);
      showToast(toastMsg, 'success');
    } catch {
      showToast('Không thể truy cập bộ nhớ tạm của trình duyệt.', 'error');
    }
  };

  const handleExport = (format: 'pdf' | 'latex' | 'csv' | 'markdown' | 'txt') => {
    setShowExportMenu(false);
    if (format === 'pdf') {
      exportReportToPdf(report);
      showToast(vi.notifications.exportedPdf, 'success');
      return;
    }
    const baseName = `matrixlab_${report.operationId}`;
    if (format === 'latex') {
      downloadTextFile(exportReportToLatex(report), `${baseName}.tex`, 'application/x-tex');
    } else if (format === 'csv') {
      downloadTextFile(exportReportToCsv(report), `${baseName}.csv`, 'text/csv');
    } else if (format === 'markdown') {
      downloadTextFile(exportReportToMarkdown(report), `${baseName}.md`, 'text/markdown');
    } else {
      downloadTextFile(exportReportToPlainText(report), `${baseName}.txt`, 'text/plain');
    }
    showToast(vi.notifications.exportedFile, 'success');
  };

  return (
    <div className="space-y-5 rounded-lg border border-[#E5E7EB] bg-white p-5 dark:border-[#303642] dark:bg-[#191C23]">
      {/* Report Header & Action Toolbar */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7EB] pb-4 dark:border-[#303642]">
        <div className="space-y-1 min-w-0">
          <h2 className="text-lg font-semibold text-[#17191F] dark:text-[#F3F4F6]">
            {report.operationName}
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#697386] dark:text-[#9CA3AF]">
            <span>{report.algorithmName}</span>
            <span aria-hidden="true">·</span>
            <span className={report.isExactResult ? 'text-[#15803D] dark:text-[#4ADE80] font-medium' : 'text-[#D97706] dark:text-[#FBBF24] font-medium'}>
              {report.isExactResult ? 'Kết quả chính xác (phân số)' : 'Giá trị xấp xỉ số học'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{report.durationMs.toFixed(1)} ms</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => saveCurrentToHistory()}
            className="inline-flex h-8 items-center gap-1.5 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-2.5 text-xs font-medium text-[#17191F] hover:bg-[#F1F3F7] dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6] whitespace-nowrap"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            Lưu phép tính
          </button>

          {/* Copy Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowCopyMenu((v) => !v);
                setShowExportMenu(false);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-2.5 text-xs font-medium text-[#17191F] hover:bg-[#F1F3F7] dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6] whitespace-nowrap"
            >
              <Copy className="h-3.5 w-3.5" />
              Sao chép
            </button>
            {showCopyMenu && (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-[#E5E7EB] bg-white py-1 shadow-md dark:border-[#303642] dark:bg-[#191C23]">
                <button
                  type="button"
                  onClick={() => handleCopy('latex')}
                  className="block w-full px-3 py-1.5 text-left text-xs text-[#17191F] hover:bg-[#F1F3F7] dark:text-[#F3F4F6] dark:hover:bg-[#20242D]"
                >
                  Sao chép mã LaTeX
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('text')}
                  className="block w-full px-3 py-1.5 text-left text-xs text-[#17191F] hover:bg-[#F1F3F7] dark:text-[#F3F4F6] dark:hover:bg-[#20242D]"
                >
                  Sao chép văn bản thuần
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('csv')}
                  className="block w-full px-3 py-1.5 text-left text-xs text-[#17191F] hover:bg-[#F1F3F7] dark:text-[#F3F4F6] dark:hover:bg-[#20242D]"
                >
                  Sao chép CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('markdown')}
                  className="block w-full px-3 py-1.5 text-left text-xs text-[#17191F] hover:bg-[#F1F3F7] dark:text-[#F3F4F6] dark:hover:bg-[#20242D]"
                >
                  Sao chép Markdown
                </button>
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowExportMenu((v) => !v);
                setShowCopyMenu(false);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded bg-[#2563EB] px-3 text-xs font-medium text-white hover:bg-[#1D4ED8] whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              Xuất kết quả
            </button>
            {showExportMenu && (
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-[#E5E7EB] bg-white py-1 shadow-md dark:border-[#303642] dark:bg-[#191C23]">
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  className="block w-full px-3 py-1.5 text-left text-xs font-medium text-[#17191F] hover:bg-[#F1F3F7] dark:text-[#F3F4F6] dark:hover:bg-[#20242D]"
                >
                  Xuất tài liệu PDF (.pdf)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('latex')}
                  className="block w-full px-3 py-1.5 text-left text-xs text-[#17191F] hover:bg-[#F1F3F7] dark:text-[#F3F4F6] dark:hover:bg-[#20242D]"
                >
                  Tải tệp LaTeX (.tex)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-[#17191F] hover:bg-[#F1F3F7] dark:text-[#F3F4F6] dark:hover:bg-[#20242D]"
                >
                  <FileSpreadsheet className="h-3 w-3" />
                  Tải bảng CSV (.csv)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('markdown')}
                  className="block w-full px-3 py-1.5 text-left text-xs text-[#17191F] hover:bg-[#F1F3F7] dark:text-[#F3F4F6] dark:hover:bg-[#20242D]"
                >
                  Tải báo cáo Markdown (.md)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('txt')}
                  className="block w-full px-3 py-1.5 text-left text-xs text-[#17191F] hover:bg-[#F1F3F7] dark:text-[#F3F4F6] dark:hover:bg-[#20242D]"
                >
                  Tải văn bản thuần (.txt)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 6 Highlighted First: Final Answer */}
      <section className="rounded-md border border-[#E5E7EB] bg-[#F8F9FB] p-4 dark:border-[#303642] dark:bg-[#111318]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#697386] dark:text-[#9CA3AF]">
            {vi.solutionSections.finalResult} — {report.resultTitle}
          </h3>
        </div>
        <div className="overflow-x-auto py-1">
          <MathFormula latex={report.resultLatex} displayMode />
        </div>

        {/* Secondary Matrices (e.g. L, U, P, Q, R, Cofactor, Basis) */}
        {report.secondaryMatrices && report.secondaryMatrices.length > 0 && (
          <div className="mt-4 grid gap-4 border-t border-[#E5E7EB] pt-4 sm:grid-cols-2 dark:border-[#303642]">
            {report.secondaryMatrices.map((sec) => (
              <div key={sec.label} className="space-y-1.5 overflow-x-auto">
                <div className="text-xs font-medium text-[#697386] dark:text-[#9CA3AF]">
                  {sec.label}
                </div>
                <MathFormula latex={`${sec.symbol} = ${sec.matrix.latex}`} displayMode />
              </div>
            ))}
          </div>
        )}

        {/* Eigenpairs Breakdown */}
        {report.eigenPairs && report.eigenPairs.length > 0 && (
          <div className="mt-4 space-y-2.5 border-t border-[#E5E7EB] pt-4 dark:border-[#303642]">
            <h4 className="text-xs font-semibold text-[#17191F] dark:text-[#F3F4F6]">
              Chi tiết trị riêng và cơ sở không gian riêng
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              {report.eigenPairs.map((ep) => (
                <div
                  key={ep.index}
                  className="rounded border border-[#E5E7EB] bg-white p-3 text-xs dark:border-[#303642] dark:bg-[#191C23]"
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB] dark:border-[#303642]">
                    <MathFormula latex={`\\lambda_{${ep.index}} = ${ep.eigenvalueLatex}`} />
                    <span className="text-[#697386] dark:text-[#9CA3AF] font-mono tabular-nums">
                      Bội ĐS: {ep.algebraicMultiplicity ?? 1}
                      {!ep.isComplex && ep.geometricMultiplicity !== undefined
                        ? ` · Bội HH: ${ep.geometricMultiplicity}`
                        : ''}
                    </span>
                  </div>
                  <div className="mt-2 overflow-x-auto">
                    {ep.isComplex ? (
                      <span className="text-[#697386] dark:text-[#9CA3AF]">
                        Trị riêng phức liên hợp (vectơ riêng thuộc không gian phức ℂⁿ).
                      </span>
                    ) : ep.eigenvectorsLatex.length > 0 ? (
                      <MathFormula
                        latex={`E(\\lambda_{${ep.index}}) = \\operatorname{span}\\left\\{ ${ep.eigenvectorsLatex.join(',\\; ')} \\right\\}`}
                      />
                    ) : (
                      <span className="text-[#697386] dark:text-[#9CA3AF]">
                        Không tách được vectơ riêng thực ổn định.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classification Checklist */}
        {report.classifications && report.classifications.length > 0 && (
          <div className="mt-4 border-t border-[#E5E7EB] pt-4 dark:border-[#303642]">
            <div className="grid gap-2 sm:grid-cols-2">
              {report.classifications.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start gap-2.5 rounded border border-[#E5E7EB] bg-white p-2.5 dark:border-[#303642] dark:bg-[#191C23]"
                >
                  {item.satisfied ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#15803D] dark:text-[#4ADE80] mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-[#929BAA] dark:text-[#6B7280] mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#17191F] dark:text-[#F3F4F6]">
                      {item.name}
                    </div>
                    <div className="text-xs text-[#697386] dark:text-[#9CA3AF] mt-0.5">
                      {item.explanation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Structured Sections 1–4: Problem, Inputs, Conditions, Method */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-2 border-b border-[#E5E7EB] pb-4 md:border-b-0 md:border-r md:pr-4 dark:border-[#303642]">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#697386] dark:text-[#9CA3AF]">
            {vi.solutionSections.problem} & {vi.solutionSections.inputs}
          </h3>
          <div className="overflow-x-auto">
            <MathFormula latex={report.problemStatementLatex} displayMode />
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            {report.inputMatrices.map((m) => (
              <div key={m.name} className="overflow-x-auto text-xs">
                <MathFormula latex={`${m.name} = ${m.display.latex}`} />
              </div>
            ))}
          </div>
          {report.extraParamsText && (
            <p className="text-xs font-mono text-[#697386] dark:text-[#9CA3AF]">
              Tham số: {report.extraParamsText}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#697386] dark:text-[#9CA3AF]">
            {vi.solutionSections.conditions} & {vi.solutionSections.method}
          </h3>
          <p className="text-xs font-medium text-[#17191F] dark:text-[#F3F4F6]">
            Phương pháp: {report.algorithmName}
          </p>
          <ul className="space-y-1.5 pt-1">
            {report.conditionsCheck.items.map((cond, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs">
                {cond.satisfied ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#15803D] dark:text-[#4ADE80] mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-[#DC2626] dark:text-[#F87171] mt-0.5" />
                )}
                <div>
                  <span className="font-medium text-[#17191F] dark:text-[#F3F4F6]">
                    {cond.label}:{' '}
                  </span>
                  <span className="text-[#697386] dark:text-[#9CA3AF]">{cond.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Section 5: Step-by-Step Solution */}
      <section className="space-y-3 border-t border-[#E5E7EB] pt-4 dark:border-[#303642]">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#697386] dark:text-[#9CA3AF]">
          {vi.solutionSections.steps}
        </h3>
        <StepViewer
          steps={report.steps}
          displayMode={displayMode}
          onChangeDisplayMode={setDisplayMode}
        />
      </section>

      {/* Section 7 & 8: Verification & Conclusion */}
      <div className="grid gap-4 border-t border-[#E5E7EB] pt-4 md:grid-cols-2 dark:border-[#303642]">
        {report.verification && (
          <section className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#697386] dark:text-[#9CA3AF]">
              {vi.solutionSections.verification}
            </h3>
            <div className="flex items-start gap-2">
              {report.verification.passed ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#15803D] dark:text-[#4ADE80] mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#D97706] dark:text-[#FBBF24] mt-0.5" />
              )}
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-semibold text-[#17191F] dark:text-[#F3F4F6]">
                  {report.verification.label}
                </div>
                <div className="overflow-x-auto text-xs">
                  <MathFormula latex={report.verification.formulaLatex} />
                </div>
                <p className="text-xs text-[#697386] dark:text-[#9CA3AF]">
                  {report.verification.detail}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#697386] dark:text-[#9CA3AF]">
            {vi.solutionSections.conclusion}
          </h3>
          <p className="text-sm text-[#17191F] dark:text-[#F3F4F6] leading-relaxed">
            {report.conclusion}
          </p>
        </section>
      </div>

      {/* Limitations */}
      {report.limitations && report.limitations.length > 0 && (
        <section className="rounded border border-[#D97706]/30 bg-amber-50/50 p-3 dark:border-[#FBBF24]/30 dark:bg-amber-950/20">
          <div className="flex items-start gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#D97706] dark:text-[#FBBF24] mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-[#17191F] dark:text-[#F3F4F6]">
                {vi.solutionSections.limitations}:
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-[#697386] dark:text-[#9CA3AF]">
                {report.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
