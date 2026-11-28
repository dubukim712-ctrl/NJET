"use client";

import { Button } from '@/components/ui/Button';
import { SmartLink } from "@/components/ui/SmartLink";
import { useRouter } from "next/navigation";
import { CalendarDays, CircleHelp, Package, LogOut, User, Settings, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { UserProfile } from "@/types/database";

interface UserNavProps {
  user: UserProfile | null;
  showHelp?: boolean;
}

export function UserNav({ user, showHelp = false }: UserNavProps) {
  const router = useRouter();
  const { user: clientUser, signOut } = useAuth();

  const displayUser = clientUser ?? user;

  const initials =
    displayUser?.full_name
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    displayUser?.email?.[0]?.toUpperCase() ||
    "U";

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  };

  if (!displayUser) {
    return null;
  }

  const canUseAdmin = hasPermission(displayUser, PERMISSIONS.adminAccess);
  const canUseStorefront = hasPermission(
    displayUser,
    PERMISSIONS.storefrontAccess,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={null} size={null}
          type="button"
          className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open user menu"
        >
          <Avatar className="h-9 w-9 border">
            <AvatarImage
              src={displayUser.avatar_url || undefined}
              alt={displayUser.full_name || "User avatar"}
            />
            <AvatarFallback className="text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48 sm:w-56"
        align="end"
        sideOffset={12}
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="truncate text-sm font-medium leading-none">
              {displayUser.full_name || "User"}
            </p>
            <p className="truncate text-xs leading-none text-muted-foreground">
              {displayUser.email}
            </p>
            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium capitalize text-foreground">
              {displayUser.role_name}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canUseStorefront && (
          <>
            {showHelp && displayUser.scope === "customer" && (
              <>
                <DropdownMenuItem asChild>
                  <SmartLink href="/orders" prefetch={true} className="flex items-center gap-2">
                    <Package className="size-4" aria-hidden="true" />
                    My orders
                  </SmartLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <SmartLink href="/appointments" prefetch={true} className="flex items-center gap-2">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    Service history
                  </SmartLink>
                </DropdownMenuItem>
              </>
            )}
            {showHelp && (
              <DropdownMenuItem asChild>
                <SmartLink href="/help" className="flex items-center gap-2">
                  <CircleHelp className="h-4 w-4" aria-hidden="true" />
                  Help
                </SmartLink>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <SmartLink href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" aria-hidden="true" />
                Settings
              </SmartLink>
            </DropdownMenuItem>
          </>
        )}
        {(canUseAdmin || canUseStorefront) && (
          <DropdownMenuItem asChild>
            <SmartLink
              href={canUseAdmin ? "/admin/profile" : "/profile"} prefetch={true}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              Profile
            </SmartLink>
          </DropdownMenuItem>
        )}
        {canUseAdmin && (
          <DropdownMenuItem asChild>
            <SmartLink prefetch={true} href="/admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </SmartLink>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
