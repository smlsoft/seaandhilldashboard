'use client';

import { ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

export interface KPIDetailItem {
    label: string;
    value: string | number;
}

export interface KPIDetailActionButton {
    label: string;
    href: string;
}

export interface KPIDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    value: string | number;
    trend?: string;
    trendUp?: boolean;
    description?: string;
    subtitle?: string;
    detailTitle?: string;
    detailNote?: string;
    detailItems?: KPIDetailItem[];
    detailContent?: ReactNode;
    detailActionButton?: KPIDetailActionButton;
}

export function KPIDetailModal({
    isOpen,
    onClose,
    title,
    value,
    trend,
    trendUp,
    description,
    subtitle,
    detailTitle,
    detailNote,
    detailItems,
    detailContent,
    detailActionButton,
}: KPIDetailModalProps) {
    const [mounted, setMounted] = useState(false);
    const dateRangeItem = detailItems?.find((item) => item.label.includes('ช่วงวันที่'));
    const trendDetailItem = detailItems?.find((item) => item.label.includes('แนวโน้ม'));
    const remainingDetailItems = (detailItems || []).filter(
        (item) => item !== dateRangeItem && item !== trendDetailItem
    );

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const onEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [isOpen, onClose]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999]">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-[90vw] max-w-2xl mx-4 p-5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] shadow-2xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">
                            {detailTitle || `รายละเอียด: ${title}`}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">ข้อมูลสรุปของตัวชี้วัดนี้</p>
                    </div>
                    <button
                        type="button"
                        className="p-1.5 rounded-md hover:bg-[hsl(var(--muted))] transition-colors"
                        onClick={onClose}
                        aria-label="Close detail modal"
                    >
                        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 mb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">ตัวชี้วัด</p>
                            <p className="text-[20px] leading-none font-bold text-[hsl(var(--foreground))] mt-1">{title}</p>
                        </div>
                        {dateRangeItem && (
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">ช่วงวันที่</p>
                                <p className="text-[20px] leading-none font-semibold text-[hsl(var(--foreground))] mt-1">
                                    {dateRangeItem.value}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                        <div>
                            <p className="text-xs text-muted-foreground">ค่าปัจจุบัน</p>
                            <p className="text-2xl leading-none font-bold text-[hsl(var(--foreground))] mt-2">{value}</p>
                            {trend && (
                                <div
                                    className={cn(
                                        'inline-flex mt-3 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                                        trendUp
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                                    )}
                                >
                                    {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    <span>{trend}</span>
                                </div>
                            )}
                        </div>
                        {trendDetailItem && (
                            <div className="mt-1 text-right">
                                <p className="text-xs text-muted-foreground">{trendDetailItem.label}</p>
                                <p className={cn(
                                    'mt-1 text-2xl leading-none font-semibold',
                                    trendUp ? 'text-emerald-600' : 'text-rose-600'
                                )}>
                                    {trendDetailItem.value}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 border-t border-[hsl(var(--border))] pt-4">
                        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                        {description && <p className="text-sm text-muted-foreground">{description}</p>}
                        {detailNote && <p className="text-sm text-muted-foreground">{detailNote}</p>}
                    </div>
                </div>

                {remainingDetailItems.length > 0 && (
                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 mb-4">
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-3">รายละเอียดเพิ่มเติม</p>
                        <div className="space-y-2">
                            {remainingDetailItems.map((item) => (
                                <div key={item.label} className="flex items-start justify-between gap-3 text-sm">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <span className="text-[hsl(var(--foreground))] font-medium text-right">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {detailContent && (
                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 mb-4">
                        {detailContent}
                    </div>
                )}

                {detailActionButton && (
                    <div className="flex gap-2">
                        <Link
                            href={detailActionButton.href}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                        >
                            <ExternalLink className="h-4 w-4" />
                            {detailActionButton.label}
                        </Link>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
