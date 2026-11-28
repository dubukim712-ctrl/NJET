"use client";

import { SmartLink } from "@/components/ui/SmartLink";
import { usePathname } from "next/navigation";
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
  LayoutDashboard,
  MessageSquareText,
  CircleHelp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { SupportChatUnreadCount } from "@/components/support-chat/SupportChatUnreadCount";
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
  additionalPermissions?: string[];
  fullAccessOnly?: boolean;
  role?: string;
  excludedRole?: string;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

const ADMIN_NAVIGATION: NavGroup[] = [
  {
    name: "Overview",
    items: [
      {
        name: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        permission: PERMISSIONS.adminAccess,
      },
    ],
  },
  {
    name: "Sales & Inventory",
    items: [
      {
        name: "Orders",
        href: "/admin/orders",
        icon: ClipboardList,
        permission: PERMISSIONS.ordersRead,
      },
      {
        name: "Customer releases",
        href: "/admin/customer-releases",
        icon: Package,
        permission: PERMISSIONS.ordersRead,
      },
      {
        name: "Products & stock",
        href: "/admin/products",
        icon: Package,
        permission: PERMISSIONS.productsRead,
      },
      {
        name: "Inventory valuation",
        href: "/admin/inventory",
        icon: Package,
        permission: PERMISSIONS.productsManage,
      },
      {
        name: "Sales report",
        href: "/admin/reports",
        icon: ChartNoAxesColumnIncreasing,
        permission: PERMISSIONS.ordersRead,
      },
    ],
  },
  {
    name: "Workshop",
    items: [
      {
        name: "Service appointments",
        href: "/admin/appointments",
        icon: Wrench,
        permission: PERMISSIONS.serviceAppointmentsRead,
        excludedRole: "technician",
      },
      {
        name: "My tasks",
        href: "/admin/my-tasks",
        icon: ClipboardList,
        permission: PERMISSIONS.serviceAppointmentsRead,
        additionalPermissions: [PERMISSIONS.serviceAppointmentsWork],
        role: "technician",
      },
    ],
  },
  {
    name: "Customers & Support",
    items: [
      {
        name: "Customer CRM",
        href: "/admin/crm",
        icon: Users,
        permission: PERMISSIONS.crmRead,
      },
      {
        name: "Customer chats",
        href: "/admin/chats",
        icon: MessageSquareText,
        permission: PERMISSIONS.supportChatManage,
      },
    ],
  },
  {
    name: "Locations & Delivery",
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
    name: "Administration",
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
      {
        name: "Settings",
        href: "/admin/settings",
        icon: Settings,
        fullAccessOnly: true,
      },
    ],
  },
  {
    name: "Resources",
    items: [
      {
        name: "Staff Guide",
        href: "/admin/help",
        icon: CircleHelp,
        permission: PERMISSIONS.adminAccess,
      },
      {
        name: "Storefront preview",
        href: "/",
        icon: ShoppingBag,
        permission: PERMISSIONS.storefrontAccess,
      },
    ],
  },
];

export function Sidebar({ user, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isCollapsible = !onNavigate;
  const visibleGroups = ADMIN_NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        (!item.permission || hasPermission(user, item.permission)) &&
        (!item.additionalPermissions ||
          item.additionalPermissions.every((permission) => hasPermission(user, permission))) &&
        (!item.fullAccessOnly || user?.is_full_access === true) &&
        (!item.role || user?.role === item.role) &&
        (!item.excludedRole || user?.role !== item.excludedRole),
    ),
  })).filter((group) => group.items.length > 0);

  const renderLink = (item: NavItem) => {
    const isCustomerChats = item.href === "/admin/chats";
    const active =
      item.href === "/admin" || item.href === "/"
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <li key={item.name}>
        <SmartLink
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          aria-label={isCustomerChats && collapsed ? item.name : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isCustomerChats && "relative",
            "hover:bg-accent hover:text-accent-foreground",
            active
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground",
          )}
          title={collapsed ? item.name : undefined}
        >
          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!collapsed && <span>{item.name}</span>}
          {isCustomerChats && (
            <SupportChatUnreadCount userId={user?.id ?? null} compact={collapsed} />
          )}
        </SmartLink>
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
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {visibleGroups.map((group) => (
          <div key={group.name} className="space-y-1">
            {!collapsed && (
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
