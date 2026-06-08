import { api } from '../api';

export interface Painter {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status?: string;
  createdAt?: string;
}

export interface PaintersResult {
  users: Painter[];
  total: number;
  page: number;
  pages: number;
}

const paintersEndpoints = api.injectEndpoints({
  endpoints: (builder) => ({
    getPainters: builder.query<PaintersResult, { q?: string; page?: number } | void>({
      query: (params) => {
        if (!params) return '/users';
        const sp = new URLSearchParams();
        if (params.q) sp.set('q', params.q);
        if (params.page && params.page > 1) sp.set('page', String(params.page));
        const qs = sp.toString();
        return qs ? `/users?${qs}` : '/users';
      },
      transformResponse: (res: { data: PaintersResult }) => res.data,
    }),
  }),
});

export const { useGetPaintersQuery } = paintersEndpoints;
