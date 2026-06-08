import { api } from '../api';
import type { UploadSig } from '@/components/jobs/submission/uploadHelpers';

const uploadsEndpoints = api.injectEndpoints({
  endpoints: (builder) => ({
    getUploadSignature: builder.mutation<UploadSig, { folder: string }>({
      query: (body) => ({ url: '/uploads/sign', method: 'POST', body }),
      transformResponse: (res: { data: UploadSig }) => res.data,
    }),
  }),
});

export const { useGetUploadSignatureMutation } = uploadsEndpoints;
