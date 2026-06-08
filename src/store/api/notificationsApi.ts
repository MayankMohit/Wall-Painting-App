import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface AppNotification {
  _id: string;
  userId: string;
  eventId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPrefs {
  push:       Record<string, boolean>;
  email:      Record<string, boolean>;
  quietHours: { start: string; end: string; tz: string } | null;
  digest:     boolean;
}

function authToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('wallpainter_token') : null;
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      const token = authToken();
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Notification', 'NotifPrefs'],
  endpoints: (builder) => ({
    getNotifications: builder.query<
      { notifications: AppNotification[]; unreadCount: number },
      { unread?: boolean; limit?: number } | void
    >({
      query: (args) => {
        const p = new URLSearchParams();
        if (args?.unread)  p.set('unread', 'true');
        if (args?.limit)   p.set('limit', String(args.limit));
        const qs = p.toString();
        return `/notifications${qs ? `?${qs}` : ''}`;
      },
      transformResponse: (res: { data: { notifications: AppNotification[]; unreadCount: number } }) =>
        res.data,
      providesTags: ['Notification'],
    }),

    markRead: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PUT' }),
      invalidatesTags: ['Notification'],
    }),

    markAllRead: builder.mutation<{ updated: number }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),

    getPreferences: builder.query<NotificationPrefs, void>({
      query: () => '/users/me/notification-preferences',
      transformResponse: (res: { data: NotificationPrefs }) => res.data,
      providesTags: ['NotifPrefs'],
    }),

    updatePreferences: builder.mutation<NotificationPrefs, Partial<NotificationPrefs>>({
      query: (body) => ({ url: '/users/me/notification-preferences', method: 'PUT', body }),
      transformResponse: (res: { data: NotificationPrefs }) => res.data,
      async onQueryStarted(patch, { dispatch, queryFulfilled }) {
        const undo = dispatch(
          notificationsApi.util.updateQueryData('getPreferences', undefined, (draft) => {
            if (patch.push)  Object.assign(draft.push, patch.push);
            if (patch.email) Object.assign(draft.email, patch.email);
            if ('quietHours' in patch) draft.quietHours = patch.quietHours ?? null;
            if (patch.digest !== undefined) draft.digest = patch.digest;
          }),
        ).undo;
        try { await queryFulfilled; } catch { undo(); }
      },
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
} = notificationsApi;
