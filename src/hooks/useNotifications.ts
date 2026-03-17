import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export interface AppNotification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    created_at: string;
}

export function useNotifications() {
    const { session } = useAuth();
    const userId = session?.user?.id;
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = async () => {
        if (!userId) return;
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (!error && data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        }
    };

    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        loadNotifications();

        // Listen for new notifications or updates to existing ones
        const channel = supabase.channel('realtime_notifications')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, () => {
                loadNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const markAsRead = async (id: string) => {
        if (!userId) return;
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        await supabase.from('notifications').update({ read: true }).eq('id', id);
    };

    const markAllAsRead = async () => {
        if (!userId) return;
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    };

    /**
     * Helper para disparar desde otras partes de la app de forma estática
     */
    const triggerNotification = async (targetUserId: string, title: string, message: string, type: string) => {
        await supabase.from('notifications').insert({
            user_id: targetUserId,
            title,
            message,
            type,
            read: false
        });
    };

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refresh: loadNotifications,
        triggerNotification
    };
}
