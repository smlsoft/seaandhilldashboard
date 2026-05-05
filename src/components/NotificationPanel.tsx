'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useBranchStore } from '@/store/useBranchStore';

interface Alert {
  id: number;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp?: string;
}

const alertConfig = {
  info: {
    icon: Info,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-l-blue-400',
    dot: 'bg-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-l-amber-400',
    dot: 'bg-amber-500',
  },
  success: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-l-emerald-400',
    dot: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    color: 'text-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-l-rose-400',
    dot: 'bg-rose-500',
  },
};

function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return '';
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'เพิ่งเกิดขึ้น';
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  return `${diffDays} วันที่แล้ว`;
}

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedBranches = useBranchStore((s) => s.selectedBranches);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch alerts from the same API as dashboard
  const { data } = useQuery({
    queryKey: ['dashboardAlerts', selectedBranches],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (!selectedBranches.includes('ALL')) {
        selectedBranches.forEach((b) => params.append('branch', b));
      }
      const queryParams = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/dashboard${queryParams}`);
      if (!res.ok) return { alerts: [] };
      const json = await res.json();
      return json;
    },
    staleTime: 60_000,
  });

  const alerts: Alert[] = data?.alerts || [];
  const unreadCount = alerts.filter((a) => !readIds.has(a.id)).length;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const markAllRead = () => {
    setReadIds(new Set(alerts.map((a) => a.id)));
  };

  const markRead = (id: number) => {
    setReadIds((prev) => new Set([...prev, id]));
  };

  // Calculate panel position from button
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  const panel = mounted && isOpen ? createPortal(
    <>
      {/* Backdrop (subtle) */}
      <div className="fixed inset-0 z-[9998]" />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{ top: panelPos.top, right: panelPos.right }}
        className="fixed z-[9999] w-[360px] max-h-[80vh] flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[hsl(var(--primary))]" />
            <span className="font-semibold text-[hsl(var(--foreground))]">การแจ้งเตือน</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[hsl(var(--primary))] px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[hsl(var(--primary))] hover:underline font-medium"
              >
                อ่านทั้งหมด
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
              aria-label="ปิด"
            >
              <X className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
                <Bell className="h-7 w-7 text-[hsl(var(--muted-foreground))]" />
              </div>
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">ไม่มีการแจ้งเตือน</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">ทุกอย่างเรียบร้อยดี!</p>
            </div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]">
              {alerts.map((alert) => {
                const config = alertConfig[alert.type];
                const Icon = config.icon;
                const isRead = readIds.has(alert.id);

                return (
                  <button
                    key={alert.id}
                    onClick={() => markRead(alert.id)}
                    className={cn(
                      'w-full text-left flex gap-4 px-5 py-4 transition-colors hover:bg-[hsl(var(--muted)/50)]',
                      'border-l-[3px]',
                      isRead ? 'border-l-transparent opacity-60' : config.border
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      config.bg, config.color
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[hsl(var(--foreground))] leading-tight">
                          {alert.title}
                        </p>
                        {!isRead && (
                          <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', config.dot)} />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-2">
                        {alert.message}
                      </p>
                      {alert.timestamp && (
                        <p className="mt-1.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                          {formatRelativeTime(alert.timestamp)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {alerts.length > 0 && (
          <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/30)] px-5 py-3 flex items-center justify-between">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {alerts.length} รายการทั้งหมด
            </p>
            <button className="text-xs font-medium text-[hsl(var(--primary))] hover:underline">
              ดูทั้งหมด
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'relative rounded-lg p-2 transition-all focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]',
          isOpen
            ? 'bg-[hsl(var(--primary)/10)] text-[hsl(var(--primary))]'
            : 'hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
        )}
        aria-label="เปิดการแจ้งเตือน"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
      </button>

      {panel}
    </>
  );
}
