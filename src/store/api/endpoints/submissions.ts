import { api } from '../api';
import type { UploadedImage } from '@/components/jobs/submission/uploadHelpers';

export interface Submission {
  _id: string;
  photoNo?: number;
  imageCount?: number;
  previewUrl?: string;
  location: string;
  sizes?: number[][]; // Made optional
  /** Owner's own size set — present only on approved submissions, never sent to painters. */
  ownerSizes?: number[][];
  
  // FORMAT B FIELDS
  shopName?: string;
  contactNo?: string;
  vanNo?: string;
  aboveBelow?: 'Above' | 'Below';

  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  createdAt?: string;
  painterId?: string;
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
  sizes?: number[][]; // Made optional
  sizeLabels?: string[];
  /** Owner's own size set — present only on approved submissions, never sent to painters. */
  ownerSizes?: number[][];
  
  // FORMAT B FIELDS
  shopName?: string;
  contactNo?: string;
  vanNo?: string;
  aboveBelow?: 'Above' | 'Below';

  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  createdAt?: string;
  notes?: string;
  rejectionReason?: string;
  images: ExPhoto[];
}

export type { UploadedImage };

export interface CreateSubmissionBody {
  photoNo: number;
  location: string;
  sizes?: [number, number][]; // Made optional
  sizeLabels?: string[];
  
  // FORMAT B FIELDS
  shopName?: string;
  contactNo?: string;
  vanNo?: string;
  aboveBelow?: 'Above' | 'Below';

  uploadedImages: UploadedImage[];
}

export interface UpdateSubmissionBody {
  location?: string;
  photoNo?: number;
  sizes?: [number, number][]; // Made optional
  sizeLabels?: string[];
  
  // FORMAT B FIELDS
  shopName?: string;
  contactNo?: string;
  vanNo?: string;
  aboveBelow?: 'Above' | 'Below';

  uploadedImages?: UploadedImage[];
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
    updateOwnerSizes: builder.mutation<void, { jobId: string; subId: string; ownerSizes: [number, number][] }>({
      query: ({ jobId, subId, ownerSizes }) => ({
        url: `/jobs/${jobId}/submissions/${subId}`,
        method: 'PUT',
        body: { ownerSizes },
      }),
      invalidatesTags: (_, __, { jobId, subId }) => [
        { type: 'SubmissionDetail', id: subId },
        { type: 'Submission', id: jobId },
      ],
    }),
    deletePhoto: builder.mutation<void, { jobId: string; subId: string; photoId: string }>({
      query: ({ jobId, subId, photoId }) => ({
        url: `/jobs/${jobId}/submissions/${subId}/photos/${photoId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { jobId, subId }) => [
        { type: 'SubmissionDetail', id: subId },
        { type: 'Submission', id: jobId },
      ],
    }),
    approveSubmission: builder.mutation<void, { jobId: string; subId: string; selectedImageIds: string[] }>({
      query: ({ jobId, subId, selectedImageIds }) => ({
        url: `/jobs/${jobId}/submissions/${subId}/approve`,
        method: 'PUT',
        body: { selectedImageIds },
      }),
      invalidatesTags: (_, __, { jobId, subId }) => [
        { type: 'SubmissionDetail', id: subId },
        { type: 'Submission', id: jobId },
        { type: 'JobDetail', id: jobId },
        'Job',
      ],
    }),
    rejectSubmission: builder.mutation<void, { jobId: string; subId: string; rejectionReason: string }>({
      query: ({ jobId, subId, rejectionReason }) => ({
        url: `/jobs/${jobId}/submissions/${subId}/reject`,
        method: 'PUT',
        body: { rejectionReason },
      }),
      invalidatesTags: (_, __, { jobId, subId }) => [
        { type: 'SubmissionDetail', id: subId },
        { type: 'Submission', id: jobId },
        { type: 'JobDetail', id: jobId },
        'Job',
      ],
    }),
    revokeSubmission: builder.mutation<void, { jobId: string; subId: string; revokeNote?: string }>({
      query: ({ jobId, subId, revokeNote }) => ({
        url: `/jobs/${jobId}/submissions/${subId}/revoke`,
        method: 'PUT',
        body: { revokeNote },
      }),
      invalidatesTags: (_, __, { jobId, subId }) => [
        { type: 'SubmissionDetail', id: subId },
        { type: 'Submission', id: jobId },
        { type: 'JobDetail', id: jobId },
        'Job',
      ],
    }),
    deleteSubmission: builder.mutation<void, { jobId: string; subId: string }>({
      query: ({ jobId, subId }) => ({
        url: `/jobs/${jobId}/submissions/${subId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { jobId }) => [
        { type: 'Submission', id: jobId },
        { type: 'JobDetail', id: jobId },
        'Job',
      ],
    }),
  }),
});

export const {
  useGetSubmissionsQuery,
  useGetSubmissionQuery,
  useCreateSubmissionMutation,
  useUpdateSubmissionMutation,
  useUpdateOwnerSizesMutation,
  useDeletePhotoMutation,
  useApproveSubmissionMutation,
  useRejectSubmissionMutation,
  useRevokeSubmissionMutation,
  useDeleteSubmissionMutation,
} = submissionsEndpoints;