import React, { useState } from 'react';
import { ArrowRight, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { OperationId } from '@/src/types/math';
import { useMatrixLabStore } from '@/src/store/useMatrixLabStore';
import { MatrixEditor } from '@/src/components/matrix-editor/MatrixEditor';
import { vi } from '@/src/locales/vi';

const QUICK_ACCESS_TOOLS: { id: OperationId; title: string; formula: string; subOp?: 'add' | 'subtract' }[] = [
  { id: 'add-sub', subOp: 'add', title: 'Cộng ma trận', formula: 'A + B' },
  { id: 'add-sub', subOp: 'subtract', title: 'Trừ ma trận', formula: 'A - B' },
  { id: 'multiply', title: 'Nhân ma trận', formula: 'A · B' },
  { id: 'determinant', title: 'Tính định thức', formula: 'det(A)' },
  { id: 'inverse', title: 'Tìm ma trận nghịch đảo', formula: 'A⁻¹' },
  { id: 'rank', title: 'Tính hạng ma trận', formula: 'rank(A)' },
  { id: 'transpose', title: 'Tìm ma trận chuyển vị', formula: 'Aᵀ' },
  { id: 'linear-system', title: 'Giải hệ phương trình tuyến tính', formula: 'AX = B' },
];

export const HomePage: React.FC = () => {
  const {
    matrices,
    slotAId,
    history,
    setActiveRoute,
    setSubOp,
    createMatrix,
    setSlotAId,
    reopenHistoryItem,
    removeHistoryItem,
    showToast,
  } = useMatrixLabStore();

  const [quickRows, setQuickRows] = useState(3);
  const [quickCols, setQuickCols] = useState(3);
  const [quickName, setQuickName] = useState('');

  const activeMatrix = matrices.find((m) => m.id === slotAId) ?? matrices[0];

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const id = createMatrix(quickName || undefined, quickRows, quickCols);
    setSlotAId(id);
    setQuickName('');
    showToast(`Đã tạo ma trận mới kích thước ${quickRows} × ${quickCols}.`, 'success');
  };

  return (
    <div className="space-y-8">
      {/* Compact Welcome Header */}
      <section className="border-b border-[#E5E7EB] pb-5 dark:border-[#303642]">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#17191F] dark:text-[#F3F4F6]">
          Chào mừng đến với MatrixLab
        </h1>
        <p className="mt-1.5 text-sm text-[#697386] dark:text-[#9CA3AF]">
          Công cụ tính toán và khám phá các phép toán Đại số tuyến tính.
        </p>
        <p className="mt-1 text-xs text-[#929BAA] dark:text-[#6B7280]">
          {vi.app.philosophyNotice}
        </p>
      </section>

      {/* Quick Access Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#17191F] dark:text-[#F3F4F6]">
            Truy cập nhanh công cụ
          </h2>
          <button
            type="button"
            onClick={() => setActiveRoute('calculator')}
            className="text-xs font-medium text-[#2563EB] hover:underline dark:text-[#60A5FA]"
          >
            Mở máy tính ma trận tổng hợp →
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACCESS_TOOLS.map((tool) => (
            <button
              key={`${tool.id}-${tool.title}`}
              type="button"
              onClick={() => {
                if (tool.subOp) setSubOp(tool.subOp);
                setActiveRoute(tool.id);
              }}
              className="group flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-colors hover:border-[#2563EB] dark:border-[#303642] dark:bg-[#191C23] dark:hover:border-[#60A5FA]"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#17191F] group-hover:text-[#2563EB] dark:text-[#F3F4F6] dark:group-hover:text-[#60A5FA] truncate">
                  {tool.title}
                </div>
                <div className="mt-0.5 font-mono text-xs text-[#697386] dark:text-[#9CA3AF]">
                  {tool.formula}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#929BAA] group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA]" />
            </button>
          ))}
        </div>
      </section>

      {/* Quick Matrix Creation + Immediate Editor */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#17191F] dark:text-[#F3F4F6]">
              Khởi tạo và nhập nhanh ma trận
            </h2>
            <p className="text-xs text-[#697386] dark:text-[#9CA3AF]">
              Tạo ma trận mới hoặc chỉnh sửa trực tiếp ma trận hiện có để dùng cho mọi phép toán.
            </p>
          </div>

          <form onSubmit={handleQuickCreate} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="Tên (vd: D)"
              maxLength={12}
              className="h-8 w-24 rounded border border-[#E5E7EB] bg-white px-2.5 text-xs text-[#17191F] focus:border-[#2563EB] focus:outline-none dark:border-[#303642] dark:bg-[#191C23] dark:text-[#F3F4F6]"
            />
            <label className="flex items-center gap-1 text-xs text-[#697386] dark:text-[#9CA3AF]">
              Hàng
              <input
                type="number"
                min={1}
                max={10}
                value={quickRows}
                onChange={(e) => setQuickRows(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                className="h-8 w-14 rounded border border-[#E5E7EB] bg-white px-2 text-center font-mono text-xs text-[#17191F] dark:border-[#303642] dark:bg-[#191C23] dark:text-[#F3F4F6]"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-[#697386] dark:text-[#9CA3AF]">
              Cột
              <input
                type="number"
                min={1}
                max={10}
                value={quickCols}
                onChange={(e) => setQuickCols(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                className="h-8 w-14 rounded border border-[#E5E7EB] bg-white px-2 text-center font-mono text-xs text-[#17191F] dark:border-[#303642] dark:bg-[#191C23] dark:text-[#F3F4F6]"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-1 rounded bg-[#2563EB] px-3 text-xs font-medium text-white hover:bg-[#1D4ED8] whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo ma trận
            </button>
          </form>
        </div>

        <MatrixEditor matrix={activeMatrix} slotRole="A" />
      </section>

      {/* Recent Calculations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#17191F] dark:text-[#F3F4F6]">
            Phép tính gần đây
          </h2>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveRoute('history')}
              className="text-xs font-medium text-[#2563EB] hover:underline dark:text-[#60A5FA]"
            >
              Xem tất cả ({history.length}) →
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-white px-5 py-8 text-center dark:border-[#303642] dark:bg-[#191C23]">
            <p className="text-sm font-medium text-[#17191F] dark:text-[#F3F4F6]">
              {vi.emptyStates.noHistoryTitle}
            </p>
            <p className="mt-1 text-xs text-[#697386] dark:text-[#9CA3AF]">
              {vi.emptyStates.noHistoryDesc}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white dark:border-[#303642] dark:bg-[#191C23]">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8F9FB] text-[#697386] dark:border-[#303642] dark:bg-[#111318] dark:text-[#9CA3AF]">
                  <th className="px-4 py-2.5 font-medium">Phép toán</th>
                  <th className="px-4 py-2.5 font-medium">Kích thước</th>
                  <th className="px-4 py-2.5 font-medium">Kết quả tóm tắt</th>
                  <th className="px-4 py-2.5 font-medium">Thời gian</th>
                  <th className="px-4 py-2.5 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#303642]">
                {history.slice(0, 6).map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8F9FB] dark:hover:bg-[#20242D]/50">
                    <td className="px-4 py-2.5 font-medium text-[#17191F] dark:text-[#F3F4F6]">
                      {item.customName ?? item.operationName}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-[#697386] dark:text-[#9CA3AF]">
                      {item.matrixDimensionsSummary}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[#17191F] dark:text-[#F3F4F6] max-w-xs truncate">
                      {item.resultPreviewText.replace(/\n/g, ' ')}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-[#697386] dark:text-[#9CA3AF] whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => reopenHistoryItem(item)}
                          className="inline-flex items-center gap-1 rounded border border-[#E5E7EB] px-2 py-1 text-xs font-medium text-[#17191F] hover:bg-[#F1F3F7] dark:border-[#303642] dark:text-[#F3F4F6] dark:hover:bg-[#20242D]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Mở lại
                        </button>
                        <button
                          type="button"
                          onClick={() => removeHistoryItem(item.id)}
                          aria-label="Xóa phép tính"
                          className="inline-flex items-center rounded border border-[#E5E7EB] p-1 text-[#697386] hover:text-[#DC2626] dark:border-[#303642] dark:text-[#9CA3AF] dark:hover:text-[#F87171]"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
