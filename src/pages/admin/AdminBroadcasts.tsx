import { useState } from "react";
import { Send } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminBroadcasts() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("announcement");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim()) return toast.error("Title required");
    setSending(true);
    const { data: profiles, error: pErr } = await supabase.from("profiles").select("user_id");
    if (pErr || !profiles) {
      setSending(false);
      return toast.error(pErr?.message || "Failed to load users");
    }
    const rows = profiles.map((p) => ({
      user_id: p.user_id,
      type,
      title,
      body,
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Broadcast sent to ${rows.length} users`);
    setTitle("");
    setBody("");
  };

  return (
    <AdminLayout title="Broadcast Notification">
      <div className="max-w-2xl rounded-2xl bg-card border border-border p-6 space-y-4">
        <div>
          <Label>Type</Label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="announcement">Announcement</option>
            <option value="maintenance">Maintenance</option>
            <option value="warning">Warning</option>
          </select>
        </div>
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the headline?" />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Write the full message..." />
        </div>
        <Button onClick={send} disabled={sending} className="gap-2 w-full">
          <Send className="h-4 w-4" />
          {sending ? "Sending..." : "Send to all users"}
        </Button>
      </div>
    </AdminLayout>
  );
}
