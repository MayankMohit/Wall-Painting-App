import { create } from 'zustand';

export type JobFilter = 'active' | 'completed' | 'invoiced';

interface OwnerStore {
  jobsFilter: JobFilter;
  setJobsFilter: (filter: JobFilter) => void;
  jobsSearch: string;
  setJobsSearch: (q: string) => void;
}

export const useOwnerStore = create<OwnerStore>((set) => ({
  jobsFilter: 'active',
  setJobsFilter: (filter) => set({ jobsFilter: filter }),
  jobsSearch: '',
  setJobsSearch: (q) => set({ jobsSearch: q }),
}));
