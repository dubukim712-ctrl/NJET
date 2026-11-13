"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Users,
  ChartNoAxesColumnIncreasing,
  ShieldCheck,
  ScrollText,
  ShoppingBag,
  Package,
  Store,
  MapPin,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { UserProfile } from "@/types/database";

interface SidebarProps {
  user: UserProfile | null;
  className?: string;
  onNavigate?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  fullAccessOnly?: boolean;
}

interface NavGroup {
  name?: string;
  items: NavItem[];
}

const ADMIN_NAVIGATION: NavGroup[] = [
  {
    items: [
      {
        name: "Dashboard",
        href: "/admin",
        icon: ChartNoAxesColumnIncreasing,
        permission: PERMISSIONS.adminAccess,
      },
    ],
  },
  {
    name: "Commerce",
    items: [
      {
        name: "Products & stock",
        href: "/admin/products",
        icon: Package,
        permission: PERMISSIONS.productsRead,
      },
      {
        name: "Orders",
        href: "/admin/orders",
        icon: ClipboardList,
        permission: PERMISSIONS.ordersRead,
      },
      {
        name: "Service appointments",
        href: "/admin/appointments",
        icon: Wrench,
        permission: PERMISSIONS.serviceAppointmentsRead,
      },
    ],
  },
  {
    name: "Locations",
    items: [
      {
        name: "Branches",
        href: "/admin/branches",
        icon: Store,
        permission: PERMISSIONS.branchesRead,
      },
      {
        name: "Delivery zones",
        href: "/admin/delivery-zones",
        icon: MapPin,
        permission: PERMISSIONS.deliveryZonesRead,
      },
    ],
  },
  {
    name: "Team & Security",
    items: [
      {
        name: "Users",
        href: "/admin/users",
        icon: Users,
        permission: PERMISSIONS.usersRead,
      },
      {
        name: "Roles",
        href: "/admin/roles",
        icon: ShieldCheck,
        permission: PERMISSIONS.rolesRead,
      },
      {
        name: "Audit Logs",
        href: "/admin/audit-logs",
        icon: ScrollText,
        permission: PERMISSIONS.auditLogsRead,
      },
    ],
  },
  {
    name: "Storefront",
    items: [
      {
        name: "Storefront preview",
        href: "/",
        icon: ShoppingBag,
        permission: PERMISSIONS.storefrontAccess,
      },
    ],
  },
  {
    name: "Global",
    items: [
      {
        name: "Settings",
        href: "/admin/settings",
        icon: Settings,
        fullAccessOnly: true,
      },
    ],
  },
];

export function Sidebar({ user, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const isCollapsible = !onNavigate;
  const visibleGroups = ADMIN_NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        (!item.permission || hasPermission(user, item.permission)) &&
        (!item.fullAccessOnly || user?.is_full_access === true),
    ),
  })).filter((group) => group.items.length > 0);

  const renderLink = (item: NavItem) => {
    const active =
      item.href === "/admin" || item.href === "/"
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <li key={item.name}>
        <Link
          href={item.href}
          prefetch={false}
          onPointerEnter={() => router.prefetch(item.href)}
          onFocus={() => router.prefetch(item.href)}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            active
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground",
          )}
          title={collapsed ? item.name : undefined}
        >
          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!collapsed && <span>{item.name}</span>}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={cn(
        "flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className,
      )}
      aria-label="Sidebar navigation"
    >
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {!collapsed && (
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Administration
          </p>
        )}
        {visibleGroups.map((group) => (
          <div key={group.name ?? "dashboard"} className="space-y-1">
            {!collapsed && group.name && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.name}
              </p>
            )}
            <ul className="space-y-1">{group.items.map(renderLink)}</ul>
          </div>
        ))}
      </nav>

      {isCollapsible && (
        <div className="border-t p-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
