import { Home, Map, Bell, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const unread = useUnreadNotifications();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/", badge: 0 },
    { icon: Map, label: t("nav.trips"), path: "/trips", badge: 0 },
    { icon: Bell, label: t("nav.notifications", "Notifications"), path: "/notifications", badge: unread },
    { icon: MessageCircle, label: t("nav.chat"), path: "/chat", badge: 0 },
    { icon: User, label: t("nav.profile"), path: "/profile", badge: 0 },
  ];

  if (location.pathname.startsWith("/auth") || location.pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom px-3 pb-3 pt-2 pointer-events-none">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center justify-around rounded-full border border-border/60 bg-card/85 px-2 py-1.5 shadow-elevated backdrop-blur-xl">
        {navItems.map(({ icon: Icon, label, path, badge }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-full px-3 py-2 transition-colors",
                active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={label}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 -z-0 rounded-full bg-gradient-primary shadow-glow"
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span className="relative">
                  <Icon className={cn("h-5 w-5", active && "scale-110")} strokeWidth={active ? 2.4 : 2} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-card">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {active && <span className="text-[11px] font-semibold">{label}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

