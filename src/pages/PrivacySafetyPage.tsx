import { useEffect, useState } from "react";
import { ArrowLeft, Shield, Eye, MapPin, MessageSquare, UserX, Loader2, PhoneCall, FileWarning, Plus, Trash2, AlertTriangle, LifeBuoy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type BlockedUser = { id: string; blocked_user_id: string; display_name?: string | null };
type Report = { id: string; reason: string; status: string | null; created_at: string };
type Emergency = { id: string; name: string; phone: string; relationship: string | null };

const SAFETY_TIPS = [
  "Always meet new travel partners in a public place first.",
  "Share your itinerary and live location with a trusted contact.",
  "Verify ID and phone numbers before sharing accommodation.",
  "Use the in-app chat — avoid moving sensitive talk off-platform too early.",
  "Trust your gut. If something feels off, report and block immediately.",
];

export default function PrivacySafetyPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [contacts, setContacts] = useState<Emergency[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRel, setNewRel] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch (error) {
        console.warn("Failed to parse privacy preferences:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [b, r, c] = await Promise.all([
        supabase.from("blocked_users" as any).select("id, blocked_user_id").eq("user_id", user.id),
        supabase.from("reports" as any).select("id, reason, status, created_at").eq("reporter_id", user.id).order("created_at", { ascending: false }),
        supabase.from("emergency_contacts" as any).select("id, name, phone, relationship").eq("user_id", user.id),
      ]);
      if (b.data) {
        const rows = b.data as any[];
        const ids = rows.map(x => x.blocked_user_id);
        const names: Record<string, string> = {};
        if (ids.length) {
          const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
          (profs ?? []).forEach((p: any) => { names[p.user_id] = p.display_name; });
        }
        setBlocked(rows.map(x => ({ id: x.id, blocked_user_id: x.blocked_user_id, display_name: names[x.blocked_user_id] })));
      }
      if (r.data) setReports(r.data as any);
      if (c.data) setContacts(c.data as any);
    })();
  }, [user]);

  const update = (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    toast.success("Preference updated");
  };

  const unblock = async (id: string) => {
    const { error } = await supabase.from("blocked_users" as any).delete().eq("id", id);
    if (error) return toast.error("Could not unblock");
    setBlocked(prev => prev.filter(b => b.id !== id));
    toast.success("Unblocked");
  };

  const addContact = async () => {
    if (!user || !newName || !newPhone) return toast.error("Name and phone required");
    const { data, error } = await supabase.from("emergency_contacts" as any)
      .insert({ user_id: user.id, name: newName, phone: newPhone, relationship: newRel || null })
      .select("id, name, phone, relationship").maybeSingle();
    if (error || !data) return toast.error("Could not add contact");
    setContacts(prev => [...prev, data as any]);
    setNewName(""); setNewPhone(""); setNewRel("");
    toast.success("Contact added");
  };

  const removeContact = async (id: string) => {
    const { error } = await supabase.from("emergency_contacts" as any).delete().eq("id", id);
    if (error) return toast.error("Could not remove");
    setContacts(prev => prev.filter(c => c.id !== id));
  };

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

  const items: { key: keyof Prefs; icon: any; title: string; desc: string }[] = [
    { key: "profile_public", icon: Eye, title: "Public profile", desc: "Allow other travelers to view your profile" },
    { key: "show_location", icon: MapPin, title: "Show my location", desc: "Display your city on your profile" },
    { key: "show_online_status", icon: Shield, title: "Show online status", desc: "Let matches see when you're active" },
    { key: "allow_messages_from_unmatched", icon: MessageSquare, title: "Messages from anyone", desc: "Receive chats from people you haven't matched with" },
  ];

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 backdrop-blur px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-heading text-lg font-bold">Privacy & Safety</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Privacy controls */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Privacy controls</h2>
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
        </section>

        {/* Blocked users */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><UserX className="h-3.5 w-3.5" /> Blocked users</h2>
          <div className="rounded-2xl bg-card shadow-card divide-y divide-border">
            {blocked.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">You haven't blocked anyone.</p>
            ) : blocked.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-4">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {(b.display_name ?? "?").charAt(0).toUpperCase()}
                </div>
                <p className="flex-1 text-sm font-medium truncate">{b.display_name ?? "User"}</p>
                <Button size="sm" variant="outline" onClick={() => unblock(b.id)}>Unblock</Button>
              </div>
            ))}
          </div>
        </section>

        {/* Emergency contacts */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><PhoneCall className="h-3.5 w-3.5" /> Emergency contacts</h2>
          <div className="rounded-2xl bg-card shadow-card p-4 space-y-3">
            {contacts.length === 0 && <p className="text-sm text-muted-foreground">Add a contact we can reach in an emergency.</p>}
            {contacts.map(c => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name} {c.relationship && <span className="text-muted-foreground font-normal">· {c.relationship}</span>}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeContact(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <div className="grid grid-cols-1 gap-2 pt-1">
              <Input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
              <Input placeholder="Phone (+91...)" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
              <Input placeholder="Relationship (optional)" value={newRel} onChange={e => setNewRel(e.target.value)} />
              <Button onClick={addContact} className="gap-2"><Plus className="h-4 w-4" /> Add contact</Button>
            </div>
          </div>
        </section>

        {/* Report history */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><FileWarning className="h-3.5 w-3.5" /> Report history</h2>
          <div className="rounded-2xl bg-card shadow-card divide-y divide-border">
            {reports.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No reports submitted.</p>
            ) : reports.map(r => (
              <div key={r.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{r.reason}</p>
                  <span className="text-xs rounded-full bg-secondary px-2 py-0.5 capitalize">{r.status ?? "pending"}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Safety tips */}
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><LifeBuoy className="h-3.5 w-3.5" /> Safety tips</h2>
          <div className="rounded-2xl bg-card shadow-card p-4 space-y-2">
            {SAFETY_TIPS.map((tip, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-accent">•</span>
                <p className="text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl bg-card shadow-card p-4 space-y-3">
          <h2 className="font-heading text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Danger zone</h2>
          <p className="text-xs text-muted-foreground">Deleting your account removes your profile, trips, and matches.</p>
          <Button variant="outline" disabled={busy} onClick={deleteAccount} className="w-full text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete my account"}
          </Button>
        </section>
      </div>
    </div>
  );
}
