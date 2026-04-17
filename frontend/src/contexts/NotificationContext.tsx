import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  station?: string;
  is_read: boolean;
  dish_id?: string;
  insumo_id?: string;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile, user, isManagement } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const isCheckingRef = React.useRef(false);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sendNativeNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo192.png' });
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, message, type, station, is_read, dish_id, insumo_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error) {
      setNotifications(data || []);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to new notifications (with user filter when possible)
    const channel = supabase
      .channel('user:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev].slice(0, 50));
          sendNativeNotification(`Brigade Noir: ${newNotif.title}`, newNotif.message);
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Notification;
          setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          setNotifications(prev => prev.filter(n => n.id !== deletedId));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, user?.id]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  /**
   * OPTIMIZED: Detects stale tasks and inventory risks.
   * Uses batch operations instead of N+1 loop.
   * Total queries: 3 (fetch tasks + fetch insumos + fetch existing notifs) + 1 batch insert
   */
  const checkStaleTasks = useCallback(async () => {
    if (!user || !profile || !isManagement || isCheckingRef.current) return;
    
    isCheckingRef.current = true;
    try {
      const now = new Date();
      const dayAgo = new Date();
      dayAgo.setHours(dayAgo.getHours() - 24);

      // 1. Fetch stale tasks + risky insumos + low stock dishes in parallel (3 queries instead of N)
      const [staleTasksRes, insumosRes, dishesRes, existingNotifsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, station')
          .eq('is_completed', false)
          .lt('created_at', dayAgo.toISOString()),
        supabase
          .from('insumos')
          .select('id, name, quantity, unit, station, status, expiry_date'),
        supabase
          .from('dishes')
          .select('id, title, porcoes, praca_responsavel'),
        // 2. Fetch ALL unread notifications at once (1 query instead of N)
        supabase
          .from('notifications')
          .select('title, station')
          .eq('is_read', false)
      ]);

      // Build a lookup set for O(1) duplicate detection
      const existingSet = new Set(
        (existingNotifsRes.data || []).map(n => `${n.title}|${n.station}`)
      );

      // Collect all new notifications to insert in a single batch
      const newNotifications: any[] = [];

      // Process stale tasks
      const staleTasks = staleTasksRes.data || [];
      for (const task of staleTasks) {
        const title = `Checklist Atrasado: ${task.title}`;
        const key = `${title}|${task.station}`;
        if (!existingSet.has(key)) {
          existingSet.add(key); // Prevent duplicates within this batch
          newNotifications.push({
            title,
            message: `A tarefa na praça ${task.station} não foi concluída nas últimas 24h.`,
            type: 'warning',
            station: task.station,
            user_id: user.id
          });
        }
      }

      // Process dishes risks (86 logic)
      const allDishes = dishesRes.data || [];
      for (const dish of allDishes) {
        if (dish.porcoes < 2) {
          const isZero = dish.porcoes <= 0;
          const title = isZero ? `PRATO ESGOTADO (86): ${dish.title}` : `ESTOQUE CRÍTICO: ${dish.title}`;
          const message = isZero 
            ? `O prato ${dish.title} acabou no menu principal.` 
            : `O prato ${dish.title} tem apenas ${dish.porcoes} unidades restantes.`;
          const type = isZero ? 'error' : 'warning';
          const station = dish.praca_responsavel || 'Cozinha';
          
          const key = `${title}|${station}`;
          if (!existingSet.has(key)) {
            existingSet.add(key);
            newNotifications.push({ title, message, type, station, dish_id: dish.id, user_id: user.id });
          }
        }
      }

      // Process inventory risks
      const allInsumos = insumosRes.data || [];
      for (const insumo of allInsumos) {
        let title = '';
        let message = '';
        let type: 'info' | 'warning' | 'error' | 'success' = 'warning';
        let shouldNotify = false;

        if (insumo.quantity <= 0) {
          shouldNotify = true;
          title = `Estoque Esgotado: ${insumo.name}`;
          message = `O item na praça ${insumo.station} acabou (Quantidade 0).`;
          type = 'error';
        } else if (insumo.status?.toLowerCase().includes('critico') || insumo.status?.toLowerCase().includes('expirado')) {
          shouldNotify = true;
          title = `Risco de Estoque: ${insumo.name}`;
          message = `Status crítico detectado na praça ${insumo.station}: ${insumo.status}.`;
          type = 'error';
        } else if (insumo.station === 'almoxarifado' && insumo.quantity < 2) {
          shouldNotify = true;
          title = `Estoque Baixo (Almoxarifado): ${insumo.name}`;
          message = `O item ${insumo.name} no estoque central está com volume crítico (${insumo.quantity} ${insumo.unit}).`;
          type = 'warning';
        } else if (insumo.expiry_date) {
          const expiry = new Date(insumo.expiry_date);
          const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 3) {
            shouldNotify = true;
            title = `Validade Próxima: ${insumo.name}`;
            message = diffDays <= 0
              ? `O item na praça ${insumo.station} VENCEU HOJE (${new Date(insumo.expiry_date).toLocaleDateString('pt-BR')})!`
              : `O item na praça ${insumo.station} vence em ${diffDays} dias (${new Date(insumo.expiry_date).toLocaleDateString('pt-BR')}).`;
            type = diffDays <= 0 ? 'error' : 'warning';
          }
        }

        if (shouldNotify) {
          const key = `${title}|${insumo.station}`;
          if (!existingSet.has(key)) {
            existingSet.add(key);
            newNotifications.push({ title, message, type, station: insumo.station, user_id: user.id });
          }
        }
      }

      // 3. Single batch insert (1 query instead of N)
      if (newNotifications.length > 0) {
        await supabase.from('notifications').insert(newNotifications);
      }

    } finally {
      isCheckingRef.current = false;
    }
  }, [user, profile, isManagement]);

  useEffect(() => {
    if (user) {
      checkStaleTasks();
    }
  }, [user, checkStaleTasks]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead, 
      refreshNotifications: fetchNotifications 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
