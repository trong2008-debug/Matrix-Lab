import React, { useState } from 'react';
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  Clock,
  Home,
  Moon,
  Settings,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';
import { OperationId } from '@/src/types/math';
import { useMatrixLabStore } from '@/src/store/useMatrixLabStore';
import { vi } from '@/src/locales/vi';

interface NavGroup {
  id: string;
  label: string;
  items: { id: OperationId; label: string }[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'workspace',
    label: vi.navGroups.workspace,
    items: [
      { id: 'home', label: vi.navItems.home },
      { id: 'calculator', label: vi.navItems.calculator },
      { id: 'history', label: vi.navItems.history },
    ],
  },
  {
    id: 'basic',
    label: vi.navGroups.basicOps,
    items: [
      { id: 'add-sub', label: vi.navItems.addSub },
      { id: 'multiply', label: vi.navItems.multiply },
      { id: 'scalar-multiply', label: vi.navItems.scalarMultiply },
      { id: 'power', label: vi.navItems.power },
      { id: 'equality', label: vi.navItems.equality },
    ],
  },
  {
    id: 'properties',
    label: vi.navGroups.properties,
    items: [
      { id: 'determinant', label: vi.navItems.determinant },
      { id: 'rank', label: vi.navItems.rank },
      { id: 'trace', label: vi.navItems.trace },
      { id: 'invertibility', label: vi.navItems.invertibility },
      { id: 'classify', label: vi.navItems.classify },
    ],
  },
  {
    id: 'transformations',
    label: vi.navGroups.transformations,
    items: [
      { id: 'transpose', label: vi.navItems.transpose },
      { id: 'inverse', label: vi.navItems.inverse },
      { id: 'adjugate', label: vi.navItems.adjugate },
      { id: 'ref', label: vi.navItems.ref },
      { id: 'rref', label: vi.navItems.rref },
    ],
  },
  {
    id: 'linear-algebra',
    label: vi.navGroups.linearAlgebra,
    items: [
      { id: 'linear-system', label: vi.navItems.linearSystem },
      { id: 'eigen', label: vi.navItems.eigen },
      { id: 'solution-space', label: vi.navItems.solutionSpace },
      { id: 'row-col-space', label: vi.navItems.rowColSpace },
      { id: 'linear-independence', label: vi.navItems.linearIndependence },
      { id: 'basis-dimension', label: vi.navItems.basisDimension },
    ],
  },
  {
    id: 'advanced',
    label: vi.navGroups.advanced,
    items: [
      { id: 'lu', label: vi.navItems.lu },
      { id: 'qr', label: vi.navItems.qr },
      { id: 'cholesky', label: vi.navItems.cholesky },
      { id: 'diagonalization', label: vi.navItems.diagonalization },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activeRoute, setActiveRoute, settings, toggleTheme } = useMatrixLabStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelect = (id: OperationId) => {
    setActiveRoute(id);
    onCloseMobile();
  };

  const getItemIcon = (id: OperationId) => {
    if (id === 'home') return <Home className="h-3.5 w-3.5 shrink-0" />;
    if (id === 'calculator') return <Calculator className="h-3.5 w-3.5 shrink-0" />;
    if (id === 'history') return <Clock className="h-3.5 w-3.5 shrink-0" />;
    if (id === 'settings') return <Settings className="h-3.5 w-3.5 shrink-0" />;
    return null;
  };

  const content = (
    <div className="flex h-full flex-col border-r border-[#E5E7EB] bg-white dark:border-[#303642] dark:bg-[#191C23]">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3.5 dark:border-[#303642]">
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="text-left focus:outline-none"
        >
          <div className="font-display text-base font-bold tracking-tight text-[#17191F] dark:text-[#F3F4F6]">
            {vi.app.name}
          </div>
          <div className="text-[11px] text-[#697386] dark:text-[#9CA3AF]">
            {vi.app.subtitle}
          </div>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Đóng menu"
          className="lg:hidden rounded p-1 text-[#697386] hover:bg-[#F1F3F7] dark:text-[#9CA3AF] dark:hover:bg-[#20242D]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Expandable Navigation Groups */}
      <nav aria-label="Điều hướng chính" className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {NAV_GROUPS.map((group) => {
          const isCollapsed = collapsed[group.id];
          return (
            <div key={group.id} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold text-[#697386] hover:text-[#17191F] dark:text-[#9CA3AF] dark:hover:text-[#F3F4F6]"
              >
                <span className="truncate">{group.label}</span>
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                )}
              </button>

              {!isCollapsed && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeRoute === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(item.id)}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                            isActive
                              ? 'bg-[#2563EB]/10 font-semibold text-[#2563EB] dark:bg-[#60A5FA]/15 dark:text-[#60A5FA]'
                              : 'font-normal text-[#17191F] hover:bg-[#F1F3F7] dark:text-[#F3F4F6] dark:hover:bg-[#20242D]'
                          }`}
                        >
                          {getItemIcon(item.id)}
                          <span className="truncate">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Settings & Theme Footer */}
      <div className="border-t border-[#E5E7EB] p-3 space-y-1 dark:border-[#303642]">
        <button
          type="button"
          onClick={() => handleSelect('settings')}
          aria-current={activeRoute === 'settings' ? 'page' : undefined}
          className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
            activeRoute === 'settings'
              ? 'bg-[#2563EB]/10 font-semibold text-[#2563EB] dark:bg-[#60A5FA]/15 dark:text-[#60A5FA]'
              : 'text-[#17191F] hover:bg-[#F1F3F7] dark:text-[#F3F4F6] dark:hover:bg-[#20242D]'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
          <span>{vi.navItems.settings}</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] text-[#697386] hover:bg-[#F1F3F7] hover:text-[#17191F] dark:text-[#9CA3AF] dark:hover:bg-[#20242D] dark:hover:text-[#F3F4F6]"
        >
          <span className="flex items-center gap-2">
            {settings.theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Moon className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{settings.theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}</span>
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block lg:w-[264px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {content}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-72 max-w-[85vw] h-full">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
