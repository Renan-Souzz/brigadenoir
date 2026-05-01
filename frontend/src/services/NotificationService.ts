import { supabase } from '../lib/supabase';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

interface NotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  station?: string;
  dish_id?: string;
  insumo_id?: string;
}

export const NotificationService = {
  /**
   * Notifies a specific user.
   */
  async notifyUser(userId: string, payload: NotificationPayload) {
    try {
      await supabase.from('notifications').insert([{
        user_id: userId,
        ...payload
      }]);
    } catch (err) {
      console.error('Error sending notification to user:', err);
    }
  },

  /**
   * Notifies all users with leadership roles (admin, chef_executivo, chef_de_cuisine, sous_chef).
   */
  async notifyLeadership(payload: NotificationPayload) {
    try {
      const { data: leaders } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'chef_executivo', 'chef_de_cuisine', 'sous_chef']);

      if (leaders && leaders.length > 0) {
        const notifications = leaders.map(l => ({
          user_id: l.id,
          ...payload
        }));
        await supabase.from('notifications').insert(notifications);
      }
    } catch (err) {
      console.error('Error sending notification to leadership:', err);
    }
  },

  /**
   * Notifies everyone assigned to a specific station.
   */
  async notifyStation(station: string, payload: NotificationPayload) {
    try {
      const { data: staff } = await supabase
        .from('profiles')
        .select('id')
        .eq('station', station);

      if (staff && staff.length > 0) {
        const notifications = staff.map(s => ({
          user_id: s.id,
          ...payload,
          station
        }));
        await supabase.from('notifications').insert(notifications);
      }
    } catch (err) {
      console.error('Error sending notification to station:', err);
    }
  }
};
