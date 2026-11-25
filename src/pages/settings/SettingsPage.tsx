import React from 'react';
import { ComputationMode, SolutionDisplayMode } from '@/src/types/math';
import { useMatrixLabStore } from '@/src/store/useMatrixLabStore';
import { vi } from '@/src/locales/vi';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, showToast } = useMatrixLabStore();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="border-b border-[#E5E7EB] pb-4 dark:border-[#303642]">
        <h1 className="font-display text-xl font-bold tracking-tight text-[#17191F] dark:text-[#F3F4F6]">
          Cài đặt hệ thống
        </h1>
        <p className="mt-1 text-sm text-[#697386] dark:text-[#9CA3AF]">
          Tùy chỉnh giao diện, chế độ số học, độ chính xác hiển thị và cách trình bày lời giải.
        </p>
      </div>

      {/* Theme */}
      <section className="rounded-lg border border-[#E5E7EB] bg-white p-5 space-y-4 dark:border-[#303642] dark:bg-[#191C23]">
        <h2 className="text-sm font-semibold text-[#17191F] dark:text-[#F3F4F6]">
          Giao diện hiển thị
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-[#17191F] dark:text-[#F3F4F6]">
              Chủ đề sáng / tối
            </div>
            <div className="text-xs text-[#697386] dark:text-[#9CA3AF]">
              Tối ưu độ tương phản cho phiên học và nghiên cứu kéo dài.
            </div>
          </div>
          <div className="inline-flex rounded-md bg-[#F1F3F7] p-0.5 dark:bg-[#20242D]">
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'light' })}
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                settings.theme === 'light'
                  ? 'bg-white text-[#17191F] shadow-xs'
                  : 'text-[#697386] dark:text-[#9CA3AF]'
              }`}
            >
              Giao diện sáng
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                settings.theme === 'dark'
                  ? 'bg-[#191C23] text-[#F3F4F6] shadow-xs'
                  : 'text-[#697386] dark:text-[#9CA3AF]'
              }`}
            >
              Giao diện tối
            </button>
          </div>
        </div>
      </section>

      {/* Arithmetic & Precision */}
      <section className="rounded-lg border border-[#E5E7EB] bg-white p-5 space-y-5 dark:border-[#303642] dark:bg-[#191C23]">
        <h2 className="text-sm font-semibold text-[#17191F] dark:text-[#F3F4F6]">
          Động cơ tính toán và độ chính xác
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-md">
            <div className="text-sm font-medium text-[#17191F] dark:text-[#F3F4F6]">
              Chế độ số học mặc định
            </div>
            <div className="text-xs text-[#697386] dark:text-[#9CA3AF]">
              Chế độ Tự động ưu tiên số học phân số chính xác BigInt cho ma trận cỡ vừa (≤ 10×10). Các phép toán vô tỉ (QR, Cholesky, Trị riêng) luôn tự động chuyển sang số học dấu phẩy động và ghi chú minh bạch.
            </div>
          </div>
          <select
            value={settings.computationMode}
            onChange={(e) => {
              updateSettings({ computationMode: e.target.value as ComputationMode });
              showToast('Đã cập nhật chế độ số học.', 'success');
            }}
            className="h-9 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-3 text-xs font-medium text-[#17191F] dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
          >
            <option value="auto">Tự động (ưu tiên phân số)</option>
            <option value="exact">Phân số chính xác</option>
            <option value="numerical">Xấp xỉ số học</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E7EB] pt-4 dark:border-[#303642]">
          <div>
            <div className="text-sm font-medium text-[#17191F] dark:text-[#F3F4F6]">
              Số chữ số thập phân hiển thị
            </div>
            <div className="text-xs text-[#697386] dark:text-[#9CA3AF]">
              Chỉ ảnh hưởng đến định dạng hiển thị ở chế độ xấp xỉ số học, không làm giảm độ chính xác tính toán bên trong.
            </div>
          </div>
          <select
            value={settings.decimalPrecision}
            onChange={(e) => updateSettings({ decimalPrecision: Number(e.target.value) })}
            className="h-9 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-3 font-mono text-xs text-[#17191F] dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
          >
            <option value={2}>2 chữ số</option>
            <option value={4}>4 chữ số</option>
            <option value={6}>6 chữ số</option>
            <option value={8}>8 chữ số</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E7EB] pt-4 dark:border-[#303642]">
          <div>
            <div className="text-sm font-medium text-[#17191F] dark:text-[#F3F4F6]">
              Ngưỡng dung sai bằng 0 (ε)
            </div>
            <div className="text-xs text-[#697386] dark:text-[#9CA3AF]">
              Áp dụng khi xác định phần tử trụ bằng 0 hoặc kiểm chứng sai số trong chế độ dấu phẩy động.
            </div>
          </div>
          <select
            value={settings.numericalTolerance}
            onChange={(e) => updateSettings({ numericalTolerance: Number(e.target.value) })}
            className="h-9 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-3 font-mono text-xs text-[#17191F] dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
          >
            <option value={1e-8}>1e-8</option>
            <option value={1e-10}>1e-10 (Mặc định)</option>
            <option value={1e-12}>1e-12</option>
          </select>
        </div>
      </section>

      {/* Solution Display */}
      <section className="rounded-lg border border-[#E5E7EB] bg-white p-5 space-y-4 dark:border-[#303642] dark:bg-[#191C23]">
        <h2 className="text-sm font-semibold text-[#17191F] dark:text-[#F3F4F6]">
          Trình bày lời giải
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-[#17191F] dark:text-[#F3F4F6]">
              Chế độ lời giải mặc định
            </div>
            <div className="text-xs text-[#697386] dark:text-[#9CA3AF]">
              Có thể chuyển đổi nhanh ngay trên từng kết quả mà không cần tính lại.
            </div>
          </div>
          <select
            value={settings.defaultDisplayMode}
            onChange={(e) => updateSettings({ defaultDisplayMode: e.target.value as SolutionDisplayMode })}
            className="h-9 rounded border border-[#E5E7EB] bg-[#F8F9FB] px-3 text-xs font-medium text-[#17191F] dark:border-[#303642] dark:bg-[#20242D] dark:text-[#F3F4F6]"
          >
            <option value="result">Chỉ kết quả</option>
            <option value="summary">Tóm tắt các giai đoạn chính</option>
            <option value="detailed">Chi tiết từng bước biến đổi</option>
          </select>
        </div>
      </section>

      {/* Computation Transparency */}
      <section className="rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] p-4 text-xs text-[#697386] dark:border-[#303642] dark:bg-[#111318] dark:text-[#9CA3AF]">
        <p className="font-semibold text-[#17191F] dark:text-[#F3F4F6]">
          Nguyên tắc minh bạch tính toán — MatrixLab
        </p>
        <p className="mt-1 leading-relaxed">{vi.app.philosophyNotice}</p>
      </section>
    </div>
  );
};
