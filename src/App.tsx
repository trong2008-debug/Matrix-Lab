import React, { useEffect, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useMatrixLabStore } from '@/src/store/useMatrixLabStore';
import { Sidebar } from '@/src/components/navigation/Sidebar';
import { HomePage } from '@/src/pages/home/HomePage';
import { WorkspacePage } from '@/src/pages/calculator/WorkspacePage';
import { HistoryPage } from '@/src/pages/history/HistoryPage';
import { SettingsPage } from '@/src/pages/settings/SettingsPage';

export default function App() {
  const {
    activeRoute,
    settings,
    toast,
    initializeApp,
    toggleTheme,
    dismissToast,
  } = useMatrixLabStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const renderPage = () => {
    switch (activeRoute) {
      case 'home':
        return <HomePage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <WorkspacePage />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8F9FB] text-[#17191F] dark:bg-[#111318] dark:text-[#F3F4F6]">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Compact Mobile Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-2.5 lg:hidden dark:border-[#303642] dark:bg-[#191C23]">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Mở menu điều hướng"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] text-[#17191F] dark:border-[#303642] dark:text-[#F3F4F6]"
          >
            <Menu className="h-4 w-4" />
          </button>

          <span className="font-display text-base font-bold tracking-tight">
            MatrixLab
          </span>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Chuyển đổi giao diện sáng/tối"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] text-[#17191F] dark:border-[#303642] dark:text-[#F3F4F6]"
          >
            {settings.theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </header>

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {renderPage()}
        </main>
      </div>

      {/* Unobtrusive Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border px-4 py-2.5 text-xs font-medium shadow-md transition-opacity ${
            toast.type === 'error'
              ? 'border-[#DC2626]/40 bg-white text-[#DC2626] dark:border-[#F87171]/40 dark:bg-[#191C23] dark:text-[#F87171]'
              : toast.type === 'success'
                ? 'border-[#15803D]/40 bg-white text-[#15803D] dark:border-[#4ADE80]/40 dark:bg-[#191C23] dark:text-[#4ADE80]'
                : 'border-[#E5E7EB] bg-white text-[#17191F] dark:border-[#303642] dark:bg-[#191C23] dark:text-[#F3F4F6]'
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Đóng thông báo"
            className="text-[#929BAA] hover:text-[#17191F] dark:hover:text-[#F3F4F6]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
