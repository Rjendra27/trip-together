import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Moon, Globe, HelpCircle, FileText, LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSelector from "@/components/LanguageSelector";
import { toast } from "sonner";

const STORAGE_KEY = "tripmate_settings";

type Settings = {
  push_notifications: boolean;
  email_notifications: boolean;
  dark_mode: boolean;
};

const DEFAULTS: Settings = {
  push_notifications: true,
  email_notifications: true,
  dark_mode: false,
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const s = { ...DEFAULTS, ...JSON.parse(raw) };
        setSettings(s);
        document.documentElement.classList.toggle("dark", s.dark_mode);
      } catch {}
    }
  }, []);

  const update = (key: keyof Settings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (key === "dark_mode") document.documentElement.classList.toggle("dark", value);
    toast.success("Saved");
  };

  const handleSignOut = async () => {
    setBusy(true);
    await signOut();
    navigate("/auth");
  };

  const toggles: { key: keyof Settings; icon: any; title: string; desc: string }[] = [
    { key: "push_notifications", icon: Bell, title: "Push notifications", desc: "Get notified about matches and messages" },
    { key: "email_notifications", icon: Bell, title: "Email notifications", desc: "Weekly digest and trip updates" },
    { key: "dark_mode", icon: Moon, title: "Dark mode", desc: "Switch to dark theme" },
  ];

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 backdrop-blur px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-heading text-lg font-bold">Settings</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="rounded-2xl bg-card shadow-card divide-y divide-border">
          {toggles.map(it => (
            <div key={it.key} className="flex items-center gap-3 p-4">
              <it.icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{it.title}</p>
                <p className="text-xs text-muted-foreground">{it.desc}</p>
              </div>
              <Switch checked={settings[it.key]} onCheckedChange={(v) => update(it.key, v)} />
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-card shadow-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium"><Globe className="h-4 w-4 text-primary" /> Language</div>
          <LanguageSelector />
        </div>

        <div className="rounded-2xl bg-card shadow-card divide-y divide-border">
          <a href="mailto:support@neverasolo.app" className="flex items-center gap-3 p-4 hover:bg-secondary/50">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium flex-1">Help & Support</span>
          </a>
          <button onClick={() => toast.info("Terms coming soon")} className="flex w-full items-center gap-3 p-4 hover:bg-secondary/50 text-left">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium flex-1">Terms & Privacy</span>
          </button>
        </div>

        <Button variant="outline" disabled={busy} onClick={handleSignOut} className="w-full rounded-xl h-11 gap-2 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> Sign Out</>}
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-2">NeverASolo · v1.0.0</p>
      </div>
    </div>
  );
}
