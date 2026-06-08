import { api } from '../api';

export interface Job {
  _id: string;
  companyName: string;
  description?: string;
  type?: 'wall' | 'shutter' | 'van';
  status: 'active' | 'completed' | 'invoiced';
  updatedAt: string;
  painters: string[];
  stats: {
    submitted: number;
    approved: number;
    pending: number;
  };
}

export interface PainterStat {
  _id: string;
  name: string;
  phone?: string;
  stats: {
    submitted: number;
    approved: number;
    pending: number;
  };
}

export interface JobDetail {
  _id: string;
  companyName: string;
  description?: string;
  status: 'active' | 'completed' | 'invoiced';
  createdAt: string;
  startDate?: string;
  endDate?: string;
  stats: {
    submitted: number;
    approved: number;
    pending: number;
  };
  painters: PainterStat[];
}

export interface PainterQueueData {
  job: { companyName: string };
  painter: { name: string };
  stats: { pending: number; approved: number; rejected: number };
  submissions: Array<{ _id: string; sizes: number[][] }>;
}

export interface JobStats {
  all: number;
  active: number;
  completed: number;
  invoiced: number;
}

interface JobsResult {
  jobs: Job[];
  total: number;
  page: number;
  pages: number;
}

export type JobFilter = 'active' | 'completed' | 'invoiced';

const jobsEndpoints = api.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query<Job[], JobFilter | void>({
      query: (status) => (status ? `/jobs?status=${status}` : '/jobs'),
      transformResponse: (res: { data: JobsResult }) => res.data.jobs,
      providesTags: ['Job'],
    }),
    getJobStats: builder.query<JobStats, void>({
      query: () => '/jobs/stats',
      transformResponse: (res: { data: JobStats }) => res.data,
      providesTags: ['Job'],
    }),
    getJob: builder.query<JobDetail, string>({
      query: (jobId) => `/jobs/${jobId}`,
      transformResponse: (res: { data: JobDetail }) => res.data,
      providesTags: (_, __, jobId) => [{ type: 'JobDetail', id: jobId }],
    }),
    createJob: builder.mutation<{ _id: string }, { companyName: string; description?: string; painterIds: string[] }>({
      query: (body) => ({ url: '/jobs', method: 'POST', body }),
      invalidatesTags: ['Job'],
    }),
    updateJob: builder.mutation<void, { jobId: string; body: { companyName?: string; description?: string; painterIds?: string[]; status?: string } }>({
      query: ({ jobId, body }) => ({ url: `/jobs/${jobId}`, method: 'PATCH', body }),
      invalidatesTags: (_, __, { jobId }) => [{ type: 'JobDetail', id: jobId }, 'Job'],
    }),
    getPainterQueue: builder.query<PainterQueueData, { jobId: string; painterId: string }>({
      query: ({ jobId, painterId }) => `/jobs/${jobId}/painters/${painterId}`,
      transformResponse: (res: { data: PainterQueueData }) => res.data,
      providesTags: (_, __, { jobId }) => [{ type: 'JobDetail', id: jobId }],
    }),
    removePainterFromJob: builder.mutation<void, { jobId: string; painterId: string }>({
      query: ({ jobId, painterId }) => ({ url: `/jobs/${jobId}/painters/${painterId}`, method: 'DELETE' }),
      invalidatesTags: (_, __, { jobId }) => [{ type: 'JobDetail', id: jobId }, 'Job'],
    }),
    deleteJob: builder.mutation<void, string>({
      query: (jobId) => ({ url: `/jobs/${jobId}`, method: 'DELETE' }),
      invalidatesTags: ['Job'],
    }),
  }),
});

export const {
  useGetJobsQuery,
  useGetJobStatsQuery,
  useGetJobQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useDeleteJobMutation,
  useGetPainterQueueQuery,
  useRemovePainterFromJobMutation,
} = jobsEndpoints;
