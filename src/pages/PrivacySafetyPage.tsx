import { useEffect, useState } from "react";
import { ArrowLeft, Shield, Eye, MapPin, MessageSquare, UserX, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "tripmate_privacy_prefs";

type Prefs = {
  profile_public: boolean;
  show_location: boolean;
  allow_messages_from_unmatched: boolean;
  show_online_status: boolean;
};

const DEFAULTS: Prefs = {
  profile_public: true,
  show_location: true,
  allow_messages_from_unmatched: false,
  show_online_status: true,
};

export default function PrivacySafetyPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setPrefs({ ...DEFAULTS, ...JSON.parse(raw) }); } catch {}
    }
  }, []);

  const update = (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    toast.success("Preference updated");
  };

  const items: { key: keyof Prefs; icon: any; title: string; desc: string }[] = [
    { key: "profile_public", icon: Eye, title: "Public profile", desc: "Allow other travelers to view your profile" },
    { key: "show_location", icon: MapPin, title: "Show my location", desc: "Display your city on your profile" },
    { key: "show_online_status", icon: Shield, title: "Show online status", desc: "Let matches see when you're active" },
    { key: "allow_messages_from_unmatched", icon: MessageSquare, title: "Messages from anyone", desc: "Receive chats from people you haven't matched with" },
  ];

  const deleteAccount = async () => {
    if (!user) return;
    if (!confirm("Permanently delete your account? This cannot be undone.")) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").delete().eq("user_id", user.id);
    setBusy(false);
    if (error) return toast.error("Could not delete account");
    toast.success("Account data removed. Signing out...");
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 backdrop-blur px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-heading text-lg font-bold">Privacy & Safety</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="rounded-2xl bg-card shadow-card divide-y divide-border">
          {items.map(it => (
            <div key={it.key} className="flex items-center gap-3 p-4">
              <it.icon className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{it.title}</p>
                <p className="text-xs text-muted-foreground">{it.desc}</p>
              </div>
              <Switch checked={prefs[it.key]} onCheckedChange={(v) => update(it.key, v)} />
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-card shadow-card p-4 space-y-3">
          <h2 className="font-heading text-sm font-semibold flex items-center gap-2"><UserX className="h-4 w-4 text-destructive" /> Danger zone</h2>
          <p className="text-xs text-muted-foreground">Deleting your account removes your profile, trips, and matches.</p>
          <Button variant="outline" disabled={busy} onClick={deleteAccount} className="w-full text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete my account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
