import { create } from 'zustand';
import {
  AppSettings,
  CalculationReport,
  DeterminantMethod,
  HistoryRecord,
  LinearSystemMethod,
  NamedMatrix,
  OperationId,
  StructuredMathError,
} from '@/src/types/math';
import {
  clearAllHistoryRecords,
  deleteHistoryRecord,
  deleteNamedMatrix,
  listHistoryRecords,
  loadAppSettings,
  loadSavedMatrices,
  renameHistoryRecord,
  saveAppSettings,
  saveHistoryRecord,
  saveNamedMatrix,
} from '@/src/services/history-service/historyDb';
import { executeCalculation } from '@/src/services/calculation-service/calculationService';
import { vi } from '@/src/locales/vi';

const DEFAULT_MATRICES: NamedMatrix[] = [
  {
    id: 'mat-a',
    name: 'A',
    rows: 3,
    cols: 3,
    data: [
      ['2', '1', '-1'],
      ['-3', '-1', '2'],
      ['-2', '1', '2'],
    ],
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'mat-b',
    name: 'B',
    rows: 3,
    cols: 1,
    data: [['8'], ['-11'], ['-3']],
    createdAt: 2,
    updatedAt: 2,
  },
  {
    id: 'mat-c',
    name: 'C',
    rows: 3,
    cols: 3,
    data: [
      ['1', '2', '0'],
      ['0', '1', '1'],
      ['2', '-1', '3'],
    ],
    createdAt: 3,
    updatedAt: 3,
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  computationMode: 'auto',
  decimalPrecision: 4,
  numericalTolerance: 1e-10,
  defaultDisplayMode: 'detailed',
};

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface MatrixLabState {
  initialized: boolean;
  activeRoute: OperationId;
  matrices: NamedMatrix[];
  slotAId: string;
  slotBId: string;
  subOp: 'add' | 'subtract';
  scalarText: string;
  exponent: number;
  detMethod: DeterminantMethod;
  systemMethod: LinearSystemMethod;
  currentReport: CalculationReport | null;
  currentError: StructuredMathError | null;
  history: HistoryRecord[];
  settings: AppSettings;
  toast: ToastMessage | null;

  initializeApp: () => Promise<void>;
  setActiveRoute: (route: OperationId) => void;
  setSlotAId: (id: string) => void;
  setSlotBId: (id: string) => void;
  swapSlotMatrices: () => void;
  setSubOp: (op: 'add' | 'subtract') => void;
  setScalarText: (val: string) => void;
  setExponent: (exp: number) => void;
  setDetMethod: (m: DeterminantMethod) => void;
  setSystemMethod: (m: LinearSystemMethod) => void;

  updateMatrixData: (id: string, data: string[][]) => void;
  resizeMatrix: (id: string, rows: number, cols: number) => void;
  createMatrix: (name?: string, rows?: number, cols?: number, data?: string[][]) => string;
  renameMatrix: (id: string, name: string) => void;
  duplicateMatrix: (id: string) => void;
  removeMatrix: (id: string) => void;

  runCalculation: (overrideOp?: OperationId) => void;
  clearResult: () => void;
  saveCurrentToHistory: (customName?: string) => Promise<void>;
  reopenHistoryItem: (record: HistoryRecord) => void;
  duplicateHistoryItem: (record: HistoryRecord) => Promise<void>;
  renameHistoryItem: (id: string, name: string) => Promise<void>;
  removeHistoryItem: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  reuseMatricesFromHistory: (record: HistoryRecord) => void;

  updateSettings: (patch: Partial<AppSettings>) => void;
  toggleTheme: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: () => void;
}

function applyThemeToDom(theme: 'light' | 'dark') {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}

export const useMatrixLabStore = create<MatrixLabState>((set, get) => ({
  initialized: false,
  activeRoute: 'home',
  matrices: DEFAULT_MATRICES,
  slotAId: 'mat-a',
  slotBId: 'mat-b',
  subOp: 'add',
  scalarText: '2',
  exponent: 2,
  detMethod: 'auto',
  systemMethod: 'gauss-jordan',
  currentReport: null,
  currentError: null,
  history: [],
  settings: DEFAULT_SETTINGS,
  toast: null,

  initializeApp: async () => {
    if (get().initialized) return;
    const [savedSettings, savedMatrices, savedHistory] = await Promise.all([
      loadAppSettings(),
      loadSavedMatrices(),
      listHistoryRecords(),
    ]);

    const settings = savedSettings ?? DEFAULT_SETTINGS;
    applyThemeToDom(settings.theme);

    const matrices = savedMatrices.length > 0 ? savedMatrices : DEFAULT_MATRICES;
    if (savedMatrices.length === 0) {
      for (const m of DEFAULT_MATRICES) {
        saveNamedMatrix(m).catch(() => {});
      }
    }

    set({
      initialized: true,
      settings,
      matrices,
      slotAId: matrices[0]?.id ?? 'mat-a',
      slotBId: matrices[1]?.id ?? matrices[0]?.id ?? 'mat-b',
      history: savedHistory,
    });
  },

  setActiveRoute: (route) => {
    set({ activeRoute: route, currentError: null });
  },

  setSlotAId: (id) => set({ slotAId: id, currentError: null }),
  setSlotBId: (id) => set({ slotBId: id, currentError: null }),

  swapSlotMatrices: () => {
    const { slotAId, slotBId } = get();
    set({ slotAId: slotBId, slotBId: slotAId, currentError: null });
  },

  setSubOp: (subOp) => set({ subOp }),
  setScalarText: (scalarText) => set({ scalarText }),
  setExponent: (exponent) => set({ exponent }),
  setDetMethod: (detMethod) => set({ detMethod }),
  setSystemMethod: (systemMethod) => set({ systemMethod }),

  updateMatrixData: (id, data) => {
    const rows = data.length;
    const cols = data[0]?.length ?? 1;
    const now = Date.now();
    set((state) => ({
      matrices: state.matrices.map((m) =>
        m.id === id ? { ...m, rows, cols, data, updatedAt: now } : m
      ),
      currentError: null,
    }));
    const updated = get().matrices.find((m) => m.id === id);
    if (updated) saveNamedMatrix(updated).catch(() => {});
  },

  resizeMatrix: (id, newRows, newCols) => {
    const clampedR = Math.max(1, Math.min(10, newRows));
    const clampedC = Math.max(1, Math.min(10, newCols));
    const target = get().matrices.find((m) => m.id === id);
    if (!target) return;

    const newData = Array.from({ length: clampedR }, (_, r) =>
      Array.from({ length: clampedC }, (__, c) => target.data[r]?.[c] ?? '0')
    );
    get().updateMatrixData(id, newData);
  },

  createMatrix: (customName, rows = 3, cols = 3, data) => {
    const { matrices } = get();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let name = customName?.trim();
    if (!name) {
      const existingNames = new Set(matrices.map((m) => m.name));
      name =
        alphabet.split('').find((ch) => !existingNames.has(ch)) ??
        `M${matrices.length + 1}`;
    }
    const id = `mat-${crypto.randomUUID().slice(0, 8)}`;
    const now = Date.now();
    const grid =
      data ??
      Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (__, c) => (r === c ? '1' : '0'))
      );
    const created: NamedMatrix = {
      id,
      name,
      rows: grid.length,
      cols: grid[0]?.length ?? cols,
      data: grid,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ matrices: [...state.matrices, created] }));
    saveNamedMatrix(created).catch(() => {});
    return id;
  },

  renameMatrix: (id, name) => {
    const clean = name.trim();
    if (!clean) return;
    set((state) => ({
      matrices: state.matrices.map((m) =>
        m.id === id ? { ...m, name: clean, updatedAt: Date.now() } : m
      ),
    }));
    const updated = get().matrices.find((m) => m.id === id);
    if (updated) saveNamedMatrix(updated).catch(() => {});
  },

  duplicateMatrix: (id) => {
    const target = get().matrices.find((m) => m.id === id);
    if (!target) return;
    const copyName = `${target.name}'`;
    const clonedData = target.data.map((r) => [...r]);
    get().createMatrix(copyName, target.rows, target.cols, clonedData);
    get().showToast(`Đã nhân bản ma trận ${target.name}.`, 'success');
  },

  removeMatrix: (id) => {
    const { matrices, slotAId, slotBId } = get();
    if (matrices.length <= 1) {
      get().showToast('Cần giữ lại ít nhất 1 ma trận trong không gian làm việc.', 'error');
      return;
    }
    const remaining = matrices.filter((m) => m.id !== id);
    set({
      matrices: remaining,
      slotAId: slotAId === id ? remaining[0].id : slotAId,
      slotBId: slotBId === id ? (remaining[1]?.id ?? remaining[0].id) : slotBId,
    });
    deleteNamedMatrix(id).catch(() => {});
  },

  runCalculation: (overrideOp) => {
    const state = get();
    const op = overrideOp ?? state.activeRoute;
    const matA = state.matrices.find((m) => m.id === state.slotAId) ?? state.matrices[0];
    const matB = state.matrices.find((m) => m.id === state.slotBId) ?? state.matrices[1] ?? state.matrices[0];

    const outcome = executeCalculation({
      operationId: op,
      matrixA: matA.data,
      matrixB: matB.data,
      subOp: state.subOp,
      scalarText: state.scalarText,
      exponent: state.exponent,
      detMethod: state.detMethod,
      systemMethod: state.systemMethod,
      computationMode: state.settings.computationMode,
      precision: state.settings.decimalPrecision,
      tolerance: state.settings.numericalTolerance,
    });

    if (!outcome.ok) {
      set({ currentError: outcome.error, currentReport: null });
      get().showToast(outcome.error.message, 'error');
      return;
    }

    const report = outcome.report;
    set({ currentReport: report, currentError: null });

    // Automatically record in history
    const record: HistoryRecord = {
      id: report.id,
      operationId: report.operationId,
      operationName: report.operationName,
      algorithmName: report.algorithmName,
      modeUsed: report.modeUsed,
      isExactResult: report.isExactResult,
      matrixDimensionsSummary: report.inputMatrices
        .map((m) => `${m.name}(${m.rows}×${m.cols})`)
        .join(', '),
      resultPreviewLatex: report.resultLatex,
      resultPreviewText: report.resultText,
      inputsSnapshot: {
        matrices: report.inputMatrices.map((m) => ({
          name: m.name,
          rows: m.rows,
          cols: m.cols,
          data:
            m.name === 'A'
              ? matA.data.map((r) => [...r])
              : matB.data.map((r) => [...r]),
        })),
        scalarText: state.scalarText,
        exponent: state.exponent,
        method: op === 'determinant' ? state.detMethod : op === 'linear-system' ? state.systemMethod : undefined,
      },
      report,
      timestamp: Date.now(),
    };

    set((s) => ({ history: [record, ...s.history].slice(0, 150) }));
    saveHistoryRecord(record).catch(() => {});
    get().showToast(vi.notifications.calculatedSuccess, 'success');
  },

  clearResult: () => set({ currentReport: null, currentError: null }),

  saveCurrentToHistory: async (customName) => {
    const { currentReport, matrices, slotAId, slotBId, scalarText, exponent, detMethod, systemMethod } = get();
    if (!currentReport) return;
    const matA = matrices.find((m) => m.id === slotAId) ?? matrices[0];
    const matB = matrices.find((m) => m.id === slotBId) ?? matrices[1] ?? matrices[0];

    const record: HistoryRecord = {
      id: currentReport.id,
      customName: customName?.trim() || undefined,
      operationId: currentReport.operationId,
      operationName: currentReport.operationName,
      algorithmName: currentReport.algorithmName,
      modeUsed: currentReport.modeUsed,
      isExactResult: currentReport.isExactResult,
      matrixDimensionsSummary: currentReport.inputMatrices
        .map((m) => `${m.name}(${m.rows}×${m.cols})`)
        .join(', '),
      resultPreviewLatex: currentReport.resultLatex,
      resultPreviewText: currentReport.resultText,
      inputsSnapshot: {
        matrices: currentReport.inputMatrices.map((m) => ({
          name: m.name,
          rows: m.rows,
          cols: m.cols,
          data: m.name === 'A' ? matA.data.map((r) => [...r]) : matB.data.map((r) => [...r]),
        })),
        scalarText,
        exponent,
        method:
          currentReport.operationId === 'determinant'
            ? detMethod
            : currentReport.operationId === 'linear-system'
              ? systemMethod
              : undefined,
      },
      report: currentReport,
      timestamp: Date.now(),
    };

    await saveHistoryRecord(record);
    set((s) => {
      const exists = s.history.some((h) => h.id === record.id);
      return {
        history: exists
          ? s.history.map((h) => (h.id === record.id ? record : h))
          : [record, ...s.history],
      };
    });
    get().showToast(vi.notifications.savedToHistory, 'success');
  },

  reopenHistoryItem: (record) => {
    get().reuseMatricesFromHistory(record);
    set({
      activeRoute: record.operationId,
      currentReport: record.report,
      currentError: null,
      scalarText: record.inputsSnapshot.scalarText ?? get().scalarText,
      exponent: record.inputsSnapshot.exponent ?? get().exponent,
    });
  },

  reuseMatricesFromHistory: (record) => {
    const snapMats = record.inputsSnapshot.matrices;
    if (snapMats[0]) {
      get().updateMatrixData(get().slotAId, snapMats[0].data.map((r) => [...r]));
    }
    if (snapMats[1]) {
      get().updateMatrixData(get().slotBId, snapMats[1].data.map((r) => [...r]));
    }
    get().showToast('Đã nạp lại dữ liệu ma trận từ lịch sử.', 'info');
  },

  duplicateHistoryItem: async (record) => {
    const dup: HistoryRecord = {
      ...record,
      id: crypto.randomUUID(),
      customName: record.customName ? `${record.customName} (bản sao)` : `${record.operationName} (bản sao)`,
      timestamp: Date.now(),
    };
    await saveHistoryRecord(dup);
    set((s) => ({ history: [dup, ...s.history] }));
    get().showToast('Đã nhân bản mục lịch sử.', 'success');
  },

  renameHistoryItem: async (id, name) => {
    await renameHistoryRecord(id, name);
    set((s) => ({
      history: s.history.map((h) => (h.id === id ? { ...h, customName: name.trim() || undefined } : h)),
    }));
    get().showToast(vi.notifications.renamedSuccess, 'success');
  },

  removeHistoryItem: async (id) => {
    await deleteHistoryRecord(id);
    set((s) => ({ history: s.history.filter((h) => h.id !== id) }));
    get().showToast(vi.notifications.deletedHistory, 'info');
  },

  clearHistory: async () => {
    await clearAllHistoryRecords();
    set({ history: [] });
    get().showToast(vi.notifications.clearedHistory, 'info');
  },

  updateSettings: (patch) => {
    set((state) => {
      const next = { ...state.settings, ...patch };
      applyThemeToDom(next.theme);
      saveAppSettings(next).catch(() => {});
      return { settings: next };
    });
  },

  toggleTheme: () => {
    const cur = get().settings.theme;
    get().updateSettings({ theme: cur === 'light' ? 'dark' : 'light' });
  },

  showToast: (message, type = 'info') => {
    const id = crypto.randomUUID();
    set({ toast: { id, message, type } });
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, 3400);
  },

  dismissToast: () => set({ toast: null }),
}));
