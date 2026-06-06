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

export interface JobDetail {
  _id: string;
  companyName: string;
  description?: string;
  status: 'active' | 'completed' | 'invoiced';
}

interface JobsResult {
  jobs: Job[];
  total: number;
  page: number;
  pages: number;
}

const jobsEndpoints = api.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query<Job[], void>({
      query: () => '/jobs',
      transformResponse: (res: { data: JobsResult }) => res.data.jobs,
      providesTags: ['Job'],
    }),
    getJob: builder.query<JobDetail, string>({
      query: (jobId) => `/jobs/${jobId}`,
      transformResponse: (res: { data: JobDetail }) => res.data,
      providesTags: (_, __, jobId) => [{ type: 'JobDetail', id: jobId }],
    }),
  }),
});

export const { useGetJobsQuery, useGetJobQuery } = jobsEndpoints;
