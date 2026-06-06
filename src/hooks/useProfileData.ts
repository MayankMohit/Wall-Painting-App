import { useState, useEffect } from 'react';

export interface ProfileData {
  name: string;
  email: string;
  phone: string;
  joined: string;
  stats: { accepted: number; pending: number };
}

export function useProfileData(user: { name?: string; email?: string } | null) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState('');
  const [isEditing, setIsEditing]     = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [editName, setEditName]       = useState('');

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('wallpainter_token');
        if (!token) throw new Error('No token');
        const res  = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load profile');
        const json = await res.json();
        const data = json?.data ?? json;
        if (!mounted) return;
        setProfileData({
          name:   data.name  || user.name  || '',
          email:  data.email || user.email || '',
          phone:  data.phone || '',
          joined: data.createdAt
            ? new Date(data.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })
            : '—',
          stats: {
            accepted: data.stats?.completedJobs   ?? 0,
            pending:  data.stats?.pendingApprovals ?? 0,
          },
        });
        setEditName(data.name || user.name || '');
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : 'Failed to load profile');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('wallpainter_token');
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to update');
      setProfileData((p) => p ? { ...p, name: editName } : p);
      setIsEditing(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    if (profileData) setEditName(profileData.name);
  };

  return {
    profileData, isLoading, error,
    isEditing, setIsEditing,
    isSaving,
    editName, setEditName,
    handleSave, cancelEdit,
  };
}
