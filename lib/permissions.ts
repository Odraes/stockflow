import { Constants, type Database } from "@/types/database";

/**
 * Role → permission map used by the APP (navigation, page guards, which
 * buttons to show).
 *
 * The DATABASE remains the real gatekeeper: RLS policies and the stock
 * functions re-check every request. If this file and the database ever
 * disagree, the database wins — a button might show, but the action fails.
 * Keep them in sync when changing roles.
 */

export type AppRole = Database["public"]["Enums"]["app_role"];
export type AccountStatus = Database["public"]["Enums"]["account_status"];

export const APP_ROLES = Constants.public.Enums.app_role;
export const ACCOUNT_STATUSES = Constants.public.Enums.account_status;

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  manager: "Manager",
  staff: "Staff",
};

export const STATUS_LABELS: Record<AccountStatus, string> = {
  pending: "Pending approval",
  active: "Active",
  disabled: "Disabled",
};

export type Permission =
  | "dashboard:view"
  | "inventory:view"
  | "inventory:manage"
  | "categories:manage"
  | "suppliers:view"
  | "suppliers:manage"
  | "stock:receive"
  | "stock:use"
  | "stock:waste"
  | "stock:adjust"
  | "transactions:view"
  | "reports:view"
  | "users:manage"
  | "settings:manage";

const STAFF: readonly Permission[] = [
  "dashboard:view",
  "inventory:view",
  "stock:use",
  "stock:waste",
  "transactions:view",
];

const MANAGER: readonly Permission[] = [
  ...STAFF,
  "inventory:manage",
  "categories:manage",
  "suppliers:view",
  "suppliers:manage",
  "stock:receive",
  "stock:adjust",
  "reports:view",
];

const ADMIN: readonly Permission[] = [...MANAGER, "users:manage", "settings:manage"];

const ROLE_PERMISSIONS: Record<AppRole, ReadonlySet<Permission>> = {
  staff: new Set(STAFF),
  manager: new Set(MANAGER),
  admin: new Set(ADMIN),
};

export function can(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}
