import {
  ArrowDownToLine,
  BarChart3,
  Boxes,
  ClipboardList,
  CupSoda,
  LayoutDashboard,
  Tags,
  Trash2,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { can, type AppRole, type Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  /** false until the page is built in a later phase. */
  available: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard:view", available: true },
  { href: "/inventory", label: "Inventory", icon: Boxes, permission: "inventory:view", available: true },
  { href: "/categories", label: "Categories", icon: Tags, permission: "categories:manage", available: true },
  { href: "/suppliers", label: "Suppliers", icon: Truck, permission: "suppliers:view", available: true },
  { href: "/stock-in", label: "Stock In", icon: ArrowDownToLine, permission: "stock:receive", available: true },
  { href: "/stock-usage", label: "Stock Usage", icon: CupSoda, permission: "stock:use", available: true },
  { href: "/wastage", label: "Wastage", icon: Trash2, permission: "stock:waste", available: true },
  { href: "/transactions", label: "Transactions", icon: ClipboardList, permission: "transactions:view", available: true },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports:view", available: true },
  { href: "/users", label: "User Management", icon: Users, permission: "users:manage", available: true },
];

/** Navigation entries this role may see (UI only — pages re-check on the server). */
export function navItemsFor(role: AppRole): NavItem[] {
  return NAV_ITEMS.filter((item) => can(role, item.permission));
}
