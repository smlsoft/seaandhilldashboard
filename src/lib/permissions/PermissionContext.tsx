'use client';

/**
 * Permission Context
 * React Context สำหรับจัดการสิทธิ์การเข้าถึงทั้งระบบ
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type {
  User,
  Module,
  ComponentKey,
  PermissionLevel,
  PermissionCheckResult,
  PermissionContextState,
} from './types';
import { getMockCurrentUser } from './mockData';

// Create Context
const PermissionContext = createContext<PermissionContextState | undefined>(undefined);

// Provider Props
interface PermissionProviderProps {
  children: ReactNode;
  initialUser?: User | null;
}

/**
 * Permission Provider Component
 * ใช้ครอบทั้งแอพเพื่อให้ทุก Component เข้าถึง Permission ได้
 */
export function PermissionProvider({ children, initialUser }: PermissionProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user on mount
  useEffect(() => {
    try {
      // ในโปรเจคจริง จะเรียก API เพื่อดึงข้อมูล User ที่ล็อกอินอยู่
      // ตอนนี้ใช้ Mock Data
      const currentUser = getMockCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      console.error('Error loading user:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ตรวจสอบสิทธิ์การเข้าถึง Component
   */
  const checkPermission = (componentKey: ComponentKey): PermissionCheckResult => {
    if (!user) {
      return {
        allowed: false,
        level: 'none',
        reason: 'ไม่พบข้อมูลผู้ใช้',
      };
    }

    // แยก Module จาก Component Key (เช่น 'sales.kpis' -> 'sales')
    const module = componentKey.split('.')[0] as Module;

    // หา Permission ของ Module นี้
    const modulePermission = user.role.permissions.find((p) => p.module === module);

    if (!modulePermission) {
      return {
        allowed: false,
        level: 'none',
        reason: `ไม่มีสิทธิ์เข้าถึง Module: ${module}`,
      };
    }

    // ถ้า Module level เป็น 'none' ก็ไม่อนุญาต
    if (modulePermission.level === 'none') {
      return {
        allowed: false,
        level: 'none',
        reason: `ไม่มีสิทธิ์เข้าถึง Module: ${module}`,
      };
    }

    // ตรวจสอบ Component-level Permission
    const componentLevel = modulePermission.components[componentKey];

    if (componentLevel === undefined) {
      // ถ้าไม่ได้กำหนด Component-level ใช้ Module-level แทน
      // ณ จุดนี้ modulePermission.level จะไม่ใช่ 'none' เพราะได้ตรวจสอบไปแล้วก่อนหน้า
      return {
        allowed: true,
        level: modulePermission.level,
      };
    }

    return {
      allowed: componentLevel !== 'none',
      level: componentLevel,
    };
  };

  /**
   * ตรวจสอบว่ามีสิทธิ์เข้าถึง Module หรือไม่
   */
  const hasModuleAccess = (module: Module): boolean => {
    if (!user) return false;

    const modulePermission = user.role.permissions.find((p) => p.module === module);
    return modulePermission ? modulePermission.level !== 'none' : false;
  };

  /**
   * ดึงระดับ Permission ของ Module
   */
  const getModulePermission = (module: Module): PermissionLevel => {
    if (!user) return 'none';

    const modulePermission = user.role.permissions.find((p) => p.module === module);
    return modulePermission ? modulePermission.level : 'none';
  };

  const value: PermissionContextState = {
    user,
    loading,
    error,
    checkPermission,
    hasModuleAccess,
    getModulePermission,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

/**
 * Hook สำหรับใช้งาน Permission Context
 * @example
 * const { user, checkPermission } = usePermissions();
 * const canView = checkPermission('sales.kpis');
 */
export function usePermissions() {
  const context = useContext(PermissionContext);

  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }

  return context;
}

/**
 * Hook สำหรับตรวจสอบสิทธิ์ Component เฉพาะ
 * @example
 * const { allowed, level } = useComponentPermission('sales.kpis');
 */
export function useComponentPermission(componentKey: ComponentKey): PermissionCheckResult {
  const { checkPermission } = usePermissions();
  return checkPermission(componentKey);
}

/**
 * Hook สำหรับตรวจสอบสิทธิ์ Module
 * @example
 * const hasAccess = useModuleAccess('sales');
 */
export function useModuleAccess(module: Module): boolean {
  const { hasModuleAccess } = usePermissions();
  return hasModuleAccess(module);
}
