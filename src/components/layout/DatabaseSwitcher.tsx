'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSelectedDatabaseKey, setSelectedDatabaseKey } from '@/app/actions/database-actions';

interface DatabaseInfo {
    key: string;
    name: string;
    type: string;
}

export function DatabaseSwitcher() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string>('');
    const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch initial data
        const init = async () => {
            try {
                // 1. Get current selection
                const key = await getSelectedDatabaseKey();
                setSelectedKey(key);

                // 2. Fetch available databases (via API route since we're on client)
                const res = await fetch('/api/databases');
                if (res.ok) {
                    const data = await res.json();
                    setDatabases(data);
                }
            } catch (error) {
                console.error('Failed to load databases:', error);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    const handleSelect = async (key: string) => {
        if (key === selectedKey) {
            setIsOpen(false);
            return;
        }

        setIsPending(true);
        try {
            await setSelectedDatabaseKey(key);
            setSelectedKey(key);
            setIsOpen(false);
            router.refresh();
            // Optional: Show success toast
        } catch (error) {
            console.error('Failed to switch database:', error);
        } finally {
            setIsPending(false);
        }
    };

    const selectedDb = databases.find(db => db.key === selectedKey);

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 rounded-lg bg-gray-50/50 animate-pulse">
                <Building2 className="h-4 w-4" />
                <span className="w-24 h-4 bg-gray-200 rounded"></span>
            </div>
        );
    }

    // If no DBs found logic could go here, but usually at least one exists.

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                className={cn(
                    "flex items-center gap-3 px-3 py-1.5 text-sm font-medium transition-colors rounded-lg",
                    "hover:bg-gray-100 hover:text-gray-900",
                    "focus:outline-none focus:ring-2 focus:ring-blue-1000/20",
                    isOpen ? "bg-blue-0 text-blue-700" : "text-gray-600",
                    isPending && "opacity-700 cursor-wait"
                )}
                title={selectedDb?.name || 'Select Branch'}
            >
                {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                    <Building2 className={cn("h-4 w-4", isOpen ? "text-blue-600" : "text-gray-500")} />
                )}

            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 z-50 origin-top-right rounded-xl bg-white p-1 shadow-lg ring-1 ring-black/5 border border-gray-100 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Select Branch / Database
                        </div>

                        <div className="max-h-[300px] overflow-y-auto space-y-0.5 custom-scrollbar">
                            {databases.map((db, index) => (
                                <button
                                    key={db.key}
                                    onClick={() => handleSelect(db.key)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all",
                                        selectedKey === db.key
                                            ? "bg-blue-50 text-blue-700 font-medium"
                                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <div className="flex flex-col items-start gap-0.5 min-w-0">
                                        <span className="truncate w-full text-left">{db.name}</span>
                                        <span className="text-[10px] text-gray-400 uppercase font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                            {db.key} • {db.type === 'POSTGRESQL' ? 'PG' : 'CH'}
                                        </span>
                                    </div>

                                    {selectedKey === db.key && (
                                        <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
