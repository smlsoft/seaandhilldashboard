'use client';

import { cn } from '@/lib/utils';
import { ReactNode, HTMLAttributes } from 'react';

// Lightweight accessible Dialog primitives following shadcn/ui naming conventions.
// Backed by the custom createPortal modal in KPIDetailModal.tsx (no additional Radix deps needed).

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col space-y-1.5', className)}>{children}</div>;
}

export function DialogTitle({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <h3
      id={id}
      className={cn('text-base font-semibold leading-none text-[hsl(var(--foreground))]', className)}
    >
      {children}
    </h3>
  );
}

export function DialogDescription({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <p
      id={id}
      className={cn('text-xs text-muted-foreground', className)}
    >
      {children}
    </p>
  );
}

export function DialogFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('flex items-center justify-end gap-2 pt-2', className)}>{children}</div>;
}
