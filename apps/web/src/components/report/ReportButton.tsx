'use client';

import { useState } from 'react';
import type { ReportTargetType } from '@tokopudidi/shared';
import { ReportModal } from './ReportModal';

interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
  className?: string;
  compact?: boolean; // hanya ikon 🚩 (untuk item kecil: ulasan/diskusi)
}

export function ReportButton({ targetType, targetId, targetLabel, className, compact }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className ?? 'text-xs text-gray-400 hover:text-red-600'}
        title="Laporkan"
        aria-label="Laporkan"
      >
        {compact ? '🚩' : '🚩 Laporkan'}
      </button>
      {open && (
        <ReportModal
          targetType={targetType}
          targetId={targetId}
          targetLabel={targetLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
