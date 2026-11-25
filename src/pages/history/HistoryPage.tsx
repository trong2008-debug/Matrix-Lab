import React, { useState } from 'react';
import {
  Copy,
  Edit3,
  ExternalLink,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useMatrixLabStore } from '@/src/store/useMatrixLabStore';
import { MathFormula } from '@/src/components/math-renderer/MathFormula';
import { vi } from '@/src/locales/vi';

export const HistoryPage: React.FC = () => {
  const {
    history,
    reopenHistoryItem,
    duplicateHistoryItem,
    renameHistoryItem,
    removeHistoryItem,
    clearHistory,
    reuseMatricesFromHistory,
  } = useMatrixLabStore();

  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = history.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (item.customName ?? '').toLowerCase().includes(q) ||
      item.operationName.toLowerCase().includes(q) ||
      item.algorithmName.toLowerCase().includes(q) ||
      item.matrixDimensionsSummary.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4 dark:border-[#303642]">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-[#17191F] dark:text-[#F3F4F6]">
            Lịch sử tính toán
          </h1>
          <p className="mt-1 text-sm text-[#697386] dark:text-[#9CA3AF]">
            Lưu trữ cục bộ trên trình duyệt (IndexedDB), bảo toàn giá trị phân số và các bước biến đổi.
          </p>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2">
            {confirmClear ? (
              <div className="flex items-center gap-2 rounded-md border border-[#DC2626]/40 bg-red-50 px-3 py-1.5 dark:bg-red-950/30">
                <span className="text-xs text-[#DC2626] dark:text-[#F87171]">
                  Xóa toàn bộ {history.length} mục?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clearHistory();
                    setConfirmClear(false);
                  }}
                  className="rounded bg-[#DC2626] px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                >
                  Xác nhận
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs text-[#17191F] dark:border-[#303642] dark:bg-[#191C23] dark:text-[#F3F4F6]"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded border border-[#E5E7EB] px-3 text-xs font-medium text-[#DC2626] hover:bg-red-50 dark:border-[#303642] dark:text-[#F87171] dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa toàn bộ lịch sử
              </button>
            )}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#929BAA]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên phép tính, kích thước hoặc thuật toán..."
            className="h-9 w-full rounded-md border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#17191F] focus:border-[#2563EB] focus:outline-none dark:border-[#303642] dark:bg-[#191C23] dark:text-[#F3F4F6]"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-white px-6 py-12 text-center dark:border-[#303642] dark:bg-[#191C23]">
          <h3 className="text-base font-semibold text-[#17191F] dark:text-[#F3F4F6]">
            {history.length === 0 ? vi.emptyStates.noHistoryTitle : 'Không tìm thấy phép tính phù hợp'}
          </h3>
          <p className="mt-1 text-sm text-[#697386] dark:text-[#9CA3AF]">
            {history.length === 0
              ? vi.emptyStates.noHistoryDesc
              : 'Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-[#E5E7EB] bg-white p-4 dark:border-[#303642] dark:bg-[#191C23]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  {editingId === item.id ? (
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        renameHistoryItem(item.id, editDraft);
                        setEditingId(null);
                      }}
                    >
                      <input
                        type="text"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        autoFocus
                        className="h-8 w-64 rounded border border-[#2563EB] bg-white px-2.5 text-sm text-[#17191F] focus:outline-none dark:bg-[#20242D] dark:text-[#F3F4F6]"
                      />
                      <button
                        type="submit"
                        className="h-8 rounded bg-[#2563EB] px-3 text-xs font-medium text-white"
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="h-8 rounded border border-[#E5E7EB] px-2.5 text-xs text-[#697386] dark:border-[#303642]"
                      >
                        Hủy
                      </button>
                    </form>
                  ) : (
                    <h3 className="text-sm font-semibold text-[#17191F] dark:text-[#F3F4F6]">
                      {item.customName ?? item.operationName}
                    </h3>
                  )}

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#697386] dark:text-[#9CA3AF]">
                    <span className="font-mono tabular-nums">{item.matrixDimensionsSummary}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.algorithmName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.isExactResult ? 'Phân số chính xác' : 'Xấp xỉ số học'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(item.timestamp).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => reopenHistoryItem(item)}
                    className="inline-flex h-8 items-center gap-1 rounded bg-[#2563EB] px-2.5 text-xs font-medium text-white hover:bg-[#1D4ED8] whitespace-nowrap"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Mở lại
                  </button>
                  <button
                    type="button"
                    onClick={() => reuseMatricesFromHistory(item)}
                    className="inline-flex h-8 items-center gap-1 rounded border border-[#E5E7EB] px-2.5 text-xs text-[#17191F] hover:bg-[#F1F3F7] dark:border-[#303642] dark:text-[#F3F4F6] dark:hover:bg-[#20242D] whitespace-nowrap"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Dùng lại ma trận
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditDraft(item.customName ?? item.operationName);
                      setEditingId(item.id);
                    }}
                    title="Đổi tên"
                    aria-label="Đổi tên"
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#E5E7EB] text-[#697386] hover:bg-[#F1F3F7] dark:border-[#303642] dark:text-[#9CA3AF] dark:hover:bg-[#20242D]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateHistoryItem(item)}
                    title="Nhân bản"
                    aria-label="Nhân bản"
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#E5E7EB] text-[#697386] hover:bg-[#F1F3F7] dark:border-[#303642] dark:text-[#9CA3AF] dark:hover:bg-[#20242D]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeHistoryItem(item.id)}
                    title="Xóa"
                    aria-label="Xóa"
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#E5E7EB] text-[#697386] hover:text-[#DC2626] dark:border-[#303642] dark:text-[#9CA3AF] dark:hover:text-[#F87171]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 overflow-x-auto rounded bg-[#F8F9FB] px-3 py-2 text-xs dark:bg-[#111318]">
                <MathFormula latex={item.resultPreviewLatex} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
