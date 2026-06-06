import { api } from '../api';

export interface Submission {
  _id: string;
  photoNo?: number;
  imageCount?: number;
  previewUrl?: string;
  location: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  createdAt?: string;
}

export interface ExPhoto {
  _id: string;
  cloudinaryUrl: string;
  previewCloudinaryUrl: string;
}

export interface SubmissionDetail {
  _id: string;
  location: string;
  photoNo: number;
  sizes: number[][];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  createdAt?: string;
  notes?: string;
  images: ExPhoto[];
}

export interface UploadedImage {
  cloudinaryId: string;
  cloudinaryUrl: string;
  previewCloudinaryId: string;
  previewCloudinaryUrl: string;
}

export interface CreateSubmissionBody {
  photoNo: number;
  location: string;
  sizes: [number, number][];
  uploadedImages: UploadedImage[];
}

export interface UpdateSubmissionBody {
  location: string;
  sizes: [number, number][];
  uploadedImages: UploadedImage[];
}

const submissionsEndpoints = api.injectEndpoints({
  endpoints: (builder) => ({
    getSubmissions: builder.query<Submission[], string>({
      query: (jobId) => `/jobs/${jobId}/submissions`,
      transformResponse: (res: { data: Submission[] }) => res.data,
      providesTags: (_, __, jobId) => [{ type: 'Submission', id: jobId }],
    }),
    getSubmission: builder.query<SubmissionDetail, { jobId: string; subId: string }>({
      query: ({ jobId, subId }) => `/jobs/${jobId}/submissions/${subId}`,
      transformResponse: (res: { data: SubmissionDetail }) => res.data,
      providesTags: (_, __, { subId }) => [{ type: 'SubmissionDetail', id: subId }],
    }),
    createSubmission: builder.mutation<void, { jobId: string; body: CreateSubmissionBody }>({
      query: ({ jobId, body }) => ({
        url: `/jobs/${jobId}/submissions`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, { jobId }) => [
        { type: 'Submission', id: jobId },
        { type: 'JobDetail', id: jobId },
        'Job',
      ],
    }),
    updateSubmission: builder.mutation<void, { jobId: string; subId: string; body: UpdateSubmissionBody }>({
      query: ({ jobId, subId, body }) => ({
        url: `/jobs/${jobId}/submissions/${subId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_, __, { jobId, subId }) => [
        { type: 'SubmissionDetail', id: subId },
        { type: 'Submission', id: jobId },
        { type: 'JobDetail', id: jobId },
        'Job',
      ],
    }),
    deletePhoto: builder.mutation<void, { jobId: string; subId: string; photoId: string }>({
      query: ({ jobId, subId, photoId }) => ({
        url: `/jobs/${jobId}/submissions/${subId}/photos/${photoId}`,
        method: 'DELETE',
      }),
    }),
  }),
});

export const {
  useGetSubmissionsQuery,
  useGetSubmissionQuery,
  useCreateSubmissionMutation,
  useUpdateSubmissionMutation,
  useDeletePhotoMutation,
} = submissionsEndpoints;
