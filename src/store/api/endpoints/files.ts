import { api } from '../api';

export interface GeneratedFile {
  _id: string;
  jobId: string;
  fileType: 'excel' | 'excel_painters' | 'pdf_photos' | 'pdf_file' | 'pdf_excel';
  fileName: string;
  fileSize?: number;
  r2Url?: string;
  status: 'generating' | 'ready' | 'failed';
  createdAt: string;
  downloadCount?: number;
}

const filesEndpoints = api.injectEndpoints({
  endpoints: (builder) => ({
    getFiles: builder.query<GeneratedFile[], string>({
      query: (jobId) => `/jobs/${jobId}/files`,
      transformResponse: (res: { files: GeneratedFile[] }) => res.files,
      providesTags: (_, __, jobId) => [{ type: 'File', id: jobId }],
    }),
    deleteFile: builder.mutation<void, { jobId: string; fileId: string }>({
      query: ({ jobId, fileId }) => ({ url: `/jobs/${jobId}/files/${fileId}`, method: 'DELETE' }),
      invalidatesTags: (_, __, { jobId }) => [{ type: 'File', id: jobId }],
    }),
    getDownloadUrl: builder.query<{ url: string }, { jobId: string; fileId: string }>({
      query: ({ jobId, fileId }) => `/jobs/${jobId}/files/${fileId}/download`,
      transformResponse: (res: { url: string }) => res,
    }),
    getPreviewUrl: builder.query<{ url: string; fileType: string }, { jobId: string; fileId: string }>({
      query: ({ jobId, fileId }) => `/jobs/${jobId}/files/${fileId}/preview`,
      transformResponse: (res: { url: string; fileType: string }) => res,
    }),
  }),
});

export const {
  useGetFilesQuery,
  useDeleteFileMutation,
  useLazyGetDownloadUrlQuery,
  useLazyGetPreviewUrlQuery,
} = filesEndpoints;
