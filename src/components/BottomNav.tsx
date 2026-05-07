import { Home, Map, Heart, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: Map, label: t("nav.trips"), path: "/trips" },
    { icon: Heart, label: t("nav.matches"), path: "/matches" },
    { icon: MessageCircle, label: t("nav.chat"), path: "/chat" },
    { icon: User, label: t("nav.profile"), path: "/profile" },
  ];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname.startsWith("/auth") || location.pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-1.5">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-1.5 h-0.5 w-6 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
