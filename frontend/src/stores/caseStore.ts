import { create } from 'zustand';
import { investigationsApi, type Investigation } from '../services/api';

interface CaseStore {
  cases: Investigation[];
  selectedCaseId: string | null;
  isLoading: boolean;
  error: string | null;
  selectCase: (id: string) => void;
  fetchCases: () => Promise<void>;
  getSelectedCase: () => Investigation | undefined;
}

export const useCaseStore = create<CaseStore>((set, get) => ({
  cases: [],
  selectedCaseId: null,
  isLoading: false,
  error: null,

  selectCase: (id) => set({ selectedCaseId: id }),

  fetchCases: async () => {
    set({ isLoading: true, error: null });
    try {
      const cases = await investigationsApi.list();
      const sorted = cases.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      set({
        cases: sorted,
        selectedCaseId: get().selectedCaseId ?? sorted[0]?.id ?? null,
        isLoading: false,
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  getSelectedCase: () => {
    const { cases, selectedCaseId } = get();
    return cases.find((c) => c.id === selectedCaseId);
  },
}));
