import { api } from '../api';

export interface Painter {
  _id: string;
  name: string;
  email?: string | null;
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
    createPainter: builder.mutation<{ painter: Painter }, { name: string; phone: string; email?: string }>({
      query: (body) => ({ url: '/users/painters', method: 'POST', body }),
      transformResponse: (res: { data: { painter: Painter } }) => res.data,
    }),
  }),
});

export const { useGetPaintersQuery, useCreatePainterMutation } = paintersEndpoints;
