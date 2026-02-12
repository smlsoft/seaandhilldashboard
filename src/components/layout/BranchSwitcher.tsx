'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Building2, X, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSelectedBranch, setSelectedBranch } from '@/app/actions/branch-actions';
import { emitBranchChange } from '@/lib/branch-events';

interface BranchInfo {
    key: string;
    name: string;
}

export function BranchSwitcher() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [selectedBranches, setSelectedBranches] = useState<string[]>(['ALL']);
    const [tempSelectedBranches, setTempSelectedBranches] = useState<string[]>(['ALL']);
    const [branches, setBranches] = useState<BranchInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Ensure component is mounted (client-side only)
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Fetch initial data
        const init = async () => {
            try {
                // 1. Get current selection (now returns array)
                const keys = await getSelectedBranch();
                setSelectedBranches(keys);
                setTempSelectedBranches(keys);

                // 2. Fetch available branches
                const res = await fetch('/api/branches');
                if (res.ok) {
                    const data = await res.json();
                    setBranches(data);
                }
            } catch (error) {
                console.error('Failed to load branches:', error);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    // Close modal on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false);
                // Reset temp selection to current selection
                setTempSelectedBranches(selectedBranches);
            }
        };

        if (isModalOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isModalOpen, selectedBranches]);

    const handleToggle = (key: string) => {
        if (key === 'ALL') {
            // Selecting "All" clears other selections
            setTempSelectedBranches(['ALL']);
        } else {
            setTempSelectedBranches(prev => {
                // Remove 'ALL' if selecting specific branch
                const withoutAll = prev.filter(k => k !== 'ALL');

                if (prev.includes(key)) {
                    // Deselecting - remove from array
                    const newSelection = withoutAll.filter(k => k !== key);
                    // If nothing selected, default to ALL
                    return newSelection.length === 0 ? ['ALL'] : newSelection;
                } else {
                    // Selecting - add to array
                    return [...withoutAll, key];
                }
            });
        }
    };

    const handleApply = async () => {
        setIsPending(true);
        try {
            await setSelectedBranch(tempSelectedBranches);
            setSelectedBranches(tempSelectedBranches);
            setIsModalOpen(false);

            // Emit event to notify all dashboard pages
            emitBranchChange(tempSelectedBranches);

            // Note: router.refresh() is removed to prevent duplicate fetch
            // revalidatePath() in setSelectedBranch already handles the refresh
        } catch (error) {
            console.error('Failed to switch branch:', error);
        } finally {
            setIsPending(false);
        }
    };

    const getDisplayText = () => {
        if (selectedBranches.includes('ALL')) {
            return 'ทุกกิจการ';
        }
        if (selectedBranches.length === 1) {
            const branch = branches.find(b => b.key === selectedBranches[0]);
            return branch?.name || 'เลือกกิจการ';
        }
        return `${selectedBranches.length} กิจการ`;
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-[hsl(var(--muted-foreground))] rounded-lg bg-[hsl(var(--accent))]/50 animate-pulse">
                <Building2 className="h-4 w-4" />
                <span className="w-24 h-4 bg-[hsl(var(--muted))] rounded"></span>
            </div>
        );
    }

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsModalOpen(true)}
                disabled={isPending}
                className={cn(
                    "flex items-center gap-3 px-3 py-1.5 text-sm font-medium transition-colors rounded-lg",
                    "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
                    "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20",
                    "text-[hsl(var(--muted-foreground))]",
                    isPending && "opacity-70 cursor-wait"
                )}
                title={getDisplayText()}
            >
                {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--primary))]" />
                ) : (
                    <Building2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{getDisplayText()}</span>
            </button>

            {/* Modal */}
            {mounted && isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={() => {
                            setIsModalOpen(false);
                            setTempSelectedBranches(selectedBranches);
                        }}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-[hsl(var(--card))] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-[hsl(var(--border))]">
                            <div>
                                <h2 className="text-2xl font-bold text-[hsl(var(--foreground))]">เลือกกิจการ</h2>
                                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                                    เลือกกิจการที่ต้องการดูข้อมูล (เลือกได้หลายกิจการ)
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setTempSelectedBranches(selectedBranches);
                                }}
                                className="p-2.5 rounded-xl hover:bg-[hsl(var(--accent))] transition-all hover:shadow-md group"
                                aria-label="ปิด"
                            >
                                <X className="h-5 w-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors" />
                            </button>
                        </div>

                        {/* Branch Grid */}
                        <div className="p-8 overflow-y-auto max-h-[calc(85vh-200px)] custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {branches.map((branch) => {
                                    const isSelected = tempSelectedBranches.includes(branch.key);

                                    return (
                                        <button
                                            key={branch.key}
                                            onClick={() => handleToggle(branch.key)}
                                            disabled={isPending}
                                            className={cn(
                                                "group relative overflow-hidden rounded-2xl border-2 flex flex-col items-center text-center transition-all duration-300",
                                                "hover:scale-[1.02] active:scale-[0.98]",
                                                "focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary))]/20",
                                                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                                                isSelected
                                                    ? "border-[hsl(var(--primary))] bg-gradient-to-br from-[hsl(var(--primary))] to-violet-600 shadow-xl shadow-[hsl(var(--primary))]/30"
                                                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary))]/50 hover:shadow-lg"
                                            )}
                                        >
                                            {/* Background Pattern for Selected */}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                                            )}

                                            {/* Card Content */}
                                            <div className="relative p-6">
                                                {/* Icon */}
                                                <div className={cn(
                                                    "mb-4 inline-flex items-center justify-center w-12 h-12 rounded-xl transition-all",
                                                    isSelected
                                                        ? "bg-white/20 backdrop-blur-sm"
                                                        : "bg-[hsl(var(--primary))]/10 group-hover:bg-[hsl(var(--primary))]/20"
                                                )}>
                                                    <Building2 className={cn(
                                                        "w-6 h-6 transition-colors",
                                                        isSelected ? "text-white" : "text-[hsl(var(--primary))]"
                                                    )} />
                                                </div>

                                                {/* Branch Name */}
                                                <h3 className={cn(
                                                    "font-bold text-lg mb-1 transition-colors",
                                                    isSelected ? "text-white" : "text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]"
                                                )}>
                                                    {branch.name}
                                                </h3>

                                                {/* Selected Indicator */}
                                                {isSelected && (
                                                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold animate-in slide-in-from-left-2 duration-200">
                                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                                        <span>เลือกแล้ว</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Shine Effect on Hover */}
                                            {!isSelected && (
                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-[hsl(var(--primary))]/10 to-transparent -translate-x-full group-hover:translate-x-full transform transition-transform duration-1000" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer with Apply Button */}
                        <div className="flex items-center justify-between px-8 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                            <div className="text-sm text-[hsl(var(--muted-foreground))]">
                                {tempSelectedBranches.includes('ALL')
                                    ? 'เลือกทุกกิจการ'
                                    : `เลือกแล้ว ${tempSelectedBranches.length} กิจการ`}
                            </div>
                            <button
                                onClick={handleApply}
                                disabled={isPending}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl font-semibold transition-all",
                                    "bg-gradient-to-r from-[hsl(var(--primary))] to-violet-600",
                                    "text-white shadow-lg shadow-[hsl(var(--primary))]/30",
                                    "hover:shadow-xl hover:scale-105",
                                    "focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary))]/20",
                                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                                    "flex items-center gap-2"
                                )}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>กำลังโหลด...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        <span>ยืนยันการเลือก</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
