import { Home, Map, Bell, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const unread = useUnreadNotifications();
  const unreadMessages = useUnreadMessages();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/", badge: 0 },
    { icon: Map, label: t("nav.trips"), path: "/trips", badge: 0 },
    { icon: Bell, label: t("nav.notifications", "Notifications"), path: "/notifications", badge: unread },
    { icon: MessageCircle, label: t("nav.chat"), path: "/chat", badge: unreadMessages },
    { icon: User, label: t("nav.profile"), path: "/profile", badge: 0 },
  ];

  if (location.pathname.startsWith("/auth") || location.pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-2xl border-t border-border/30 px-4 py-2 pb-safe shadow-[0_-8px_35px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-lg items-center justify-between w-full px-1">
        {navItems.map(({ icon: Icon, label, path, badge }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "relative flex flex-col items-center justify-center py-1 flex-1 text-center select-none transition-all duration-300",
                active ? "text-primary font-bold scale-102" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={label}
            >
              {/* Radial Ambient Backglow for Active Icon */}
              {active && (
                <motion.div
                  layoutId="active-nav-glow"
                  className="absolute w-9 h-9 rounded-full bg-primary/12 blur-md -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}

              <span className="relative flex items-center justify-center">
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-transform duration-300", 
                    active && "scale-110 text-primary filter drop-shadow-[0_0_6px_rgba(234,88,12,0.35)]"
                  )} 
                  strokeWidth={active ? 2.4 : 2} 
                />
                
                {/* Micro badge notifications indicator */}
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-destructive text-destructive-foreground text-[8px] font-extrabold flex items-center justify-center ring-2 ring-background">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>

              {/* Captions below icon styled in clean Airbnb fashion */}
              <span className={cn(
                "text-[9px] tracking-wide mt-1 select-none transition-colors duration-300 font-medium",
                active ? "text-primary font-bold" : "text-muted-foreground/80"
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

