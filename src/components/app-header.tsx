import { Link, NavLink, useLocation } from "react-router-dom";
import { mainMenu } from "@/config/menu";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { AppLogo } from "./app-logo";
import { AppSidebar } from "./app-sidebar";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { baseUrl } from "@/config/app";
import { ModeToggle } from "./mode-toggle";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";


export function AppHeader() {
  const location = useLocation();
  const username = localStorage.getItem("username") || "User";
  const email = localStorage.getItem("email") || "Not signed in";
  const navigate = useNavigate();

  const handleLogout = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    toast.success("Logged out successfully");
    navigate("/"); 
  } catch (err: any) {
    console.error("Logout error:", err);
    toast.error("Failed to log out");
  }
};

  return (
    <header className="bg-background sticky top-0 z-50 border-b">
      <div className="w-full ~max-w-7xl mx-auto flex items-center gap-2 h-14 px-4 md:px-8">
        <div className="flex items-center gap-2 md:gap-0">
          <AppSidebar />
          <Link to="/dashboard">
            <AppLogo />
          </Link>
        </div>

        <div className="ml-4 flex-1 flex items-center justify-between">
          <div className="flex-1">
            <nav className="hidden md:flex gap-1">
              {mainMenu.map((item, index) =>
                item.items && item.items.length > 0 ? (
                  <DropdownMenu key={index}>
                    <DropdownMenuTrigger className="focus-visible:outline-none">
                      <NavLink
                        key={index}
                        to={item.url}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2 overflow-hidden rounded-md p-2.5 text-left text-sm outline-none transition-[width,height,padding] hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 active:bg-accent active:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>svg]:size-4",
                            "h-8 text-sm hover:bg-accent hover:text-accent-foreground",
                            isActive
                              ? "text-foreground bg-accent"
                              : "text-foreground/70"
                          )
                        }
                      >
                        {item.icon && <item.icon />}
                        <span className="font-medium">{item.title}</span>
                        <ChevronDown className="!size-3 -ml-1" />
                      </NavLink>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-56">
                      {item.items.map((subItem, index) => (
                        <DropdownMenuItem key={index} asChild>
                          <NavLink
                            to={subItem.url}
                            className={cn(
                              "cursor-pointer",
                              subItem.url === location.pathname && "bg-muted"
                            )}
                          >
                            {subItem.title}
                          </NavLink>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <NavLink
                    key={index}
                    to={item.url}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 overflow-hidden rounded-md p-2.5 text-left text-sm outline-none transition-[width,height,padding] hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 active:bg-accent active:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>svg]:size-4",
                        "h-8 text-sm hover:bg-accent hover:text-accent-foreground",
                        isActive
                          ? "text-foreground bg-accent"
                          : "text-foreground/70"
                      )
                    }
                  >
                    {item.icon && <item.icon />}
                    <span className="font-medium">{item.title}</span>
                  </NavLink>
                )
              )}
            </nav>
          </div>
          <nav className="flex gap-1">
            <ModeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full cursor-pointer ml-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={baseUrl + "avatars/user.png"}
                      alt="logo"
                    />
                    <AvatarFallback className="rounded-lg">SC</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-2">
                  <Link to="/user">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {username}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {email}
                      </p>
                    </div>
                  </Link>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}
