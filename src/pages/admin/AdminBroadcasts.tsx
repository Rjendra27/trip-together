import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminBroadcasts() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("announcement");
  const [sending, setSending] = useState(false);
  const [audienceCount, setAudienceCount] = useState(0);

  useEffect(() => {
    const loadAudience = async () => {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      setAudienceCount(count ?? 0);
    };
    loadAudience();
    const channel = supabase.channel("admin-broadcast-live").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, loadAudience).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const send = async () => {
    if (!title.trim()) return toast.error("Title required");
    setSending(true);
    const { data: profiles, error: pErr } = await supabase.from("profiles").select("user_id");
    if (pErr || !profiles) {
      setSending(false);
      return toast.error(pErr?.message || "Failed to load users");
    }
    const rows = profiles.map((p) => ({ user_id: p.user_id, type, title: title.trim(), body: body.trim() }));
    const { error } = await supabase.from("notifications").insert(rows);
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Broadcast sent to ${rows.length} users`);
    setTitle("");
    setBody("");
  };

  return (
    <AdminLayout title="Settings & Broadcasts">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="max-w-2xl rounded-2xl bg-card border border-border p-6 space-y-4">
          <div><Label>Type</Label><Select value={type} onValueChange={setType}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="announcement">Announcement</SelectItem><SelectItem value="maintenance">Maintenance alert</SelectItem><SelectItem value="warning">Safety warning</SelectItem></SelectContent></Select></div>
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the headline?" maxLength={120} /></div>
          <div><Label>Message</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Write the full message..." maxLength={1000} /></div>
          <Button onClick={send} disabled={sending} className="gap-2 w-full"><Send className="h-4 w-4" />{sending ? "Sending..." : "Send to all users"}</Button>
        </div>
        <div className="rounded-2xl bg-card border border-border p-5 h-fit space-y-4">
          <div><p className="text-sm text-muted-foreground">Broadcast audience</p><p className="font-heading text-3xl font-bold">{audienceCount}</p></div>
          <div className="border-t border-border pt-4 text-sm text-muted-foreground">Admin-only settings and notifications are protected by role-based access and update live as users join TripMate.</div>
        </div>
      </div>
    </AdminLayout>
  );
}
