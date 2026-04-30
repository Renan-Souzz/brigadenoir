import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppRole = 'admin' | 'chef_executivo' | 'chef_de_cuisine' | 'sous_chef' | 'chef_de_partie' | 'commis' | 'ficha_tecnica' | 'fichas';
export type KitchenStation = 'saucier' | 'garde_manger' | 'entremetier' | 'rotisseur' | 'poissonier' | 'patissier';

export interface Profile {
  id: string;
  full_name: string | null;
  role: AppRole;
  station: KitchenStation | null;
  shift?: 'manha' | 'tarde';
  avatar_url: string | null;
  last_seen?: string;
  updated_at?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isManagement: boolean;
  isStationLead: boolean;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  requirePasswordChange: boolean;
  completePasswordChange: (newPassword: string) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  const isAdmin = !!profile?.role && ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef'].includes(profile.role);
  const isManagement = isAdmin;
  const isStationLead = profile?.role === 'chef_de_partie';

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (_event === 'PASSWORD_RECOVERY') {
        setRequirePasswordChange(true);
      }

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. Heartbeat: Update 'last_seen' periodically if user is logged in
  useEffect(() => {
    if (!user) return;

    const updateHeartbeat = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id);
      } catch (err) {
        console.error('Heartbeat failed:', err);
      }
    };

    // Initial heartbeat
    updateHeartbeat();

    // Set interval for every 60 seconds
    const interval = setInterval(updateHeartbeat, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, station, avatar_url')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data as Profile);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    if (id === user?.id) {
      await fetchProfile(id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const completePasswordChange = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setRequirePasswordChange(false);
  };

  const value = {
    session,
    user,
    profile,
    loading,
    isAdmin,
    isManagement,
    isStationLead,
    updateProfile,
    signOut,
    refreshProfile,
    requirePasswordChange,
    completePasswordChange
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
