import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

function authToken() {
  return typeof window !== 'undefined'
    ? localStorage.getItem('wallpainter_token')
    : null;
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      const token = authToken();
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: [
    'Job',
    'JobDetail',
    'Submission',
    'SubmissionDetail',
  ],
  endpoints: () => ({}),
});
