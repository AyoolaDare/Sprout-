
'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingCart,
  BarChart2,
  Package,
  Settings,
  Sprout,
  LogOut,
  RefreshCcw,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth, useProfile } from './auth-provider';
import { signOut } from '@/lib/auth';
import InstallPwaButton from './install-pwa-button';
import { cn } from '@/lib/utils';
import { useEffect, useState, useTransition } from 'react';
import { useIdleTimer } from '@/hooks/use-idle-timer';
import { Separator } from './ui/separator';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/expenses', label: 'Expenses', icon: ShoppingCart },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function NavMenu() {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarMenu className="gap-1.5">
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            tooltip={item.label}
            onClick={handleLinkClick}
            className={cn(
              "px-3 py-2 h-11 transition-all duration-200",
              pathname === item.href 
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
            )}
          >
            <Link href={item.href}>
              <item.icon className="h-5 w-5" />
              <span className="font-semibold text-sm">{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function RefreshButton() {
    const router = useRouter();
    const [isRefreshing, startRefresh] = useTransition();

    const handleRefresh = () => {
        startRefresh(() => {
            router.refresh();
        });
    };
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
            className="h-8 w-8"
        >
            <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
    )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { businessProfile } = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [isPWA, setIsPWA] = useState(false);
  
  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  useIdleTimer(handleSignOut, 60 * 60 * 1000); // 1 hour

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsPWA(true);
    }
  }, []);
  
  if (pathname === '/login' || pathname.startsWith('/receipts/verify')) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  const pageTitle = pathname === '/' ? 'Dashboard' : pathname.split('/')[1].replace(/-/g, ' ');

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="inset" className="bg-sidebar border-none">
        <SidebarHeader className="h-16 flex flex-row items-center px-6 gap-3">
          <div className="p-2 bg-sidebar-primary rounded-lg text-sidebar-primary-foreground shadow-md shrink-0">
             <Sprout className="h-5 w-5" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-base leading-none tracking-tight">Sprout Track</span>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3">
           <NavMenu />
        </SidebarContent>
        <SidebarFooter className="p-4 flex flex-col gap-4">
          <div className="flex items-center gap-3 w-full p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-9 w-9 border-2 border-sidebar-primary/20 shadow-sm shrink-0">
              {businessProfile?.logoUrl ? (
                <AvatarImage src={businessProfile.logoUrl} alt="Business Logo" />
              ) : (
                <AvatarImage src={user.photoURL ?? ""} alt="User Avatar" />
              )}
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-bold text-xs uppercase">
                {user.displayName?.[0] || user.email?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="text-xs font-bold truncate leading-tight">{user.displayName ?? 'My Business'}</span>
              <span className="text-[10px] text-sidebar-foreground/50 truncate">
                {user.email}
              </span>
            </div>
          </div>
          <Separator className="bg-sidebar-accent" />
          <div className="space-y-1">
             <InstallPwaButton />
             <Button 
                variant="ghost" 
                className="w-full justify-start text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 h-10 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center transition-colors" 
                onClick={handleSignOut}
             >
                <LogOut className="h-4 w-4" />
                <span className="ml-3 group-data-[collapsible=icon]:hidden text-xs font-semibold">Sign Out</span>
             </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-background px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground transition-colors" />
            <Separator orientation="vertical" className="h-4" />
            <h1 className="text-sm font-bold text-foreground capitalize tracking-tight">
                {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isPWA && <RefreshButton />}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto w-full pb-10">
                {children}
            </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
