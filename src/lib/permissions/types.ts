/**
 * Permission System Types
 * กำหนด Types สำหรับระบบจัดการสิทธิ์การเข้าถึง Component-level
 */

// ประเภทของ Module หลัก
export type Module = 'accounting' | 'sales' | 'purchase' | 'inventory';

// ประเภทของ Permission Level
export type PermissionLevel = 'none' | 'view' | 'full';

// Component-level Permission Keys
export type ComponentKey =
  // Accounting Components
  | 'accounting.kpis'
  | 'accounting.pl_statement'
  | 'accounting.balance_sheet'
  | 'accounting.cash_flow'
  | 'accounting.ar_aging'
  | 'accounting.ap_aging'
  | 'accounting.revenue_breakdown'
  | 'accounting.expense_breakdown'

  // Sales Components
  | 'sales.kpis'
  | 'sales.trend'
  | 'sales.top_products'
  | 'sales.by_branch'
  | 'sales.by_salesperson'
  | 'sales.top_customers'
  | 'sales.ar_status'

  // Purchase Components
  | 'purchase.kpis'
  | 'purchase.trend'
  | 'purchase.top_suppliers'
  | 'purchase.by_category'
  | 'purchase.by_brand'
  | 'purchase.ap_outstanding'

  // Inventory Components
  | 'inventory.kpis'
  | 'inventory.stock_movement'
  | 'inventory.low_stock'
  | 'inventory.overstock'
  | 'inventory.slow_moving'
  | 'inventory.turnover'
  | 'inventory.by_branch';

// Module Permission Configuration
export interface ModulePermission {
  module: Module;
  level: PermissionLevel;
  components: Partial<Record<ComponentKey, PermissionLevel>>;
}

// User Role Definition
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: ModulePermission[];
}

// User with Permissions
export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  allowed_branches?: string[];
}

// Permission Check Result
export interface PermissionCheckResult {
  allowed: boolean;
  level: PermissionLevel;
  reason?: string;
}

// Permission Context State
export interface PermissionContextState {
  user: User | null;
  loading: boolean;
  error: string | null;
  checkPermission: (componentKey: ComponentKey) => PermissionCheckResult;
  hasModuleAccess: (module: Module) => boolean;
  getModulePermission: (module: Module) => PermissionLevel;
}
