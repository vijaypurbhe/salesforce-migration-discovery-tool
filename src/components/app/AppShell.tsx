import { Link, NavLink, Outlet } from "react-router-dom";
import { BookOpen, LayoutGrid, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { BrandMark } from "./Brand";
import { cn } from "@/lib/utils";

export default function AppShell() {
  const { profile, user, isAdmin, isInternal, signOut } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) =>
    cn("inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors", isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground");
  const name = profile?.display_name || user?.email || "";
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-background">Skip to content</a>
      <header className="no-print sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="container flex h-14 items-center gap-6">
          <Link to="/" aria-label="Portfolio home"><BrandMark /></Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink to="/" end className={link}><LayoutGrid className="h-4 w-4" />Portfolio</NavLink>
            <NavLink to="/glossary" className={link}><BookOpen className="h-4 w-4" />Glossary & sources</NavLink>
            {isAdmin && <NavLink to="/admin" className={link}><Settings className="h-4 w-4" />Administration</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {!isInternal && <span className="hidden md:inline text-xs rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">Customer access</span>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="h-7 w-7 rounded-full bg-teal-soft text-teal-soft-foreground grid place-items-center text-xs font-bold">{name.slice(0, 2).toUpperCase()}</span>
                  <span className="hidden sm:inline max-w-[180px] truncate">{name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">{isAdmin ? "Workspace administrator" : isInternal ? "Internal team" : "Customer user"}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4 mr-2" />Leave workspace</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1"><Outlet /></main>
    </div>
  );
}
