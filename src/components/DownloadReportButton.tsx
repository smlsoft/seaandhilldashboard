'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  TrendingUp, 
  LucideIcon, 
  ChevronDown, 
  FileSpreadsheet, // ไอคอนสำหรับ Excel
  FileText         // ไอคอนสำหรับ PDF
} from 'lucide-react';

interface DownloadReportButtonProps {
  onDownloadExcel?: () => void; // รับฟังก์ชันโหลด Excel
  onDownloadPdf?: () => void;   // รับฟังก์ชันโหลด PDF
  label?: string;
  icon?: LucideIcon;
  className?: string;
}

export function DownloadReportButton({
  onDownloadExcel,
  onDownloadPdf,
  label = 'ดาวน์โหลดรายงาน',
  icon: Icon = TrendingUp,
  className = '',
}: DownloadReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ฟังก์ชันสำหรับปิดเมนูเมื่อคลิกพื้นที่อื่นข้างนอก
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* ปุ่มหลัก */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className={`inline-flex items-center justify-center rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[hsl(var(--primary))/90] transition-colors ${className}`}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
        <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* เมนูย่อย (Dropdown) */}
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100">
          <div className="py-1">
            {/* ปุ่ม Excel */}
            <button
              onClick={() => {
                onDownloadExcel?.();
                setIsOpen(false);
              }}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <FileSpreadsheet className="mr-3 h-4 w-4 text-green-600" />
              Excel (.xlsx)
            </button>

            {/* ปุ่ม PDF */}
            <button
              onClick={() => {
                onDownloadPdf?.();
                setIsOpen(false);
              }}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <FileText className="mr-3 h-4 w-4 text-red-600" />
              PDF (.pdf)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}