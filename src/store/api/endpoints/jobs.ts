import { api } from '../api';

export interface Job {
  _id: string;
  companyName: string;
  description?: string;
  jobType: 'Wall' | 'Shutter' | 'Van';
  pdfFormat: 'A' | 'B';
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
  jobType: 'Wall' | 'Shutter' | 'Van';
  pdfFormat: 'A' | 'B';
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

export interface InviteLinks {
  url: string;
  waLink: string;
  message: string;
  expiresAt: string;
  expiresLabel: string;
}

export interface JobInvite {
  _id: string;
  painterId: string;
  status: 'active' | 'revoked';
  expiresAt: string;
  lastUsedAt: string | null;
  // Present only for active invites — the rebuilt share link.
  url?: string;
  waLink?: string;
  message?: string;
  expiresLabel?: string;
}

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
    createJob: builder.mutation<{ _id: string }, { companyName: string; description?: string; painterIds: string[]; jobType: 'Wall' | 'Shutter' | 'Van'; pdfFormat: 'A' | 'B' }>({
      query: (body) => ({ url: '/jobs', method: 'POST', body }),
      invalidatesTags: ['Job'],
    }),
    updateJob: builder.mutation<void, { jobId: string; body: { companyName?: string; description?: string; painterIds?: string[]; status?: string; jobType?: 'Wall' | 'Shutter' | 'Van'; pdfFormat?: 'A' | 'B' } }>({
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
    getJobInvites: builder.query<JobInvite[], string>({
      query: (jobId) => `/jobs/${jobId}/invites`,
      transformResponse: (res: { data: JobInvite[] }) => res.data,
      providesTags: (_, __, jobId) => [{ type: 'Invite', id: jobId }],
    }),
    createInvite: builder.mutation<InviteLinks, { jobId: string; painterId: string }>({
      query: ({ jobId, painterId }) => ({ url: `/jobs/${jobId}/invites`, method: 'POST', body: { painterId } }),
      transformResponse: (res: { data: InviteLinks }) => res.data,
      invalidatesTags: (_, __, { jobId }) => [{ type: 'Invite', id: jobId }],
    }),
    revokeInvite: builder.mutation<{ revoked: number }, { jobId: string; painterId: string }>({
      query: ({ jobId, painterId }) => ({ url: `/jobs/${jobId}/invites`, method: 'DELETE', body: { painterId } }),
      transformResponse: (res: { data: { revoked: number } }) => res.data,
      invalidatesTags: (_, __, { jobId }) => [{ type: 'Invite', id: jobId }],
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
  useGetJobInvitesQuery,
  useCreateInviteMutation,
  useRevokeInviteMutation,
} = jobsEndpoints;
