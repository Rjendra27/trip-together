import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Eye, Search, Shield, Star, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const [profilesRes, reviewsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
    ]);
    if (profilesRes.error) toast.error(profilesRes.error.message);
    if (reviewsRes.error) toast.error(reviewsRes.error.message);
    setUsers(profilesRes.data ?? []);
    setReviews(reviewsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-users-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getUserReviews = (userId: string) => reviews.filter((r) => r.reviewed_user_id === userId);
  const getRating = (userId: string) => {
    const list = getUserReviews(userId);
    if (!list.length) return "—";
    return (list.reduce((sum, r) => sum + Number(r.rating || 0), 0) / list.length).toFixed(1);
  };

  const toggleBlock = async (u: any) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: !u.is_blocked }).eq("user_id", u.user_id);
    if (error) return toast.error(error.message);
    toast.success(u.is_blocked ? "User unblocked" : "User blocked");
  };

  const deleteUser = async (u: any) => {
    if (!confirm(`Permanently delete ${u.display_name || "this user"} and all related account data?`)) return;
    const { error } = await supabase.functions.invoke("admin-delete-user", { body: { userId: u.user_id } });
    if (error) return toast.error(error.message);
    toast.success("User deleted");
    load();
  };

  const filtered = useMemo(
    () => users.filter((u) => [u.display_name, u.location, u.travel_style, u.gender].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())),
    [users, q]
  );

  return (
    <AdminLayout title="Users">
      <div className="flex items-center gap-2 mb-4 bg-card border border-border rounded-xl px-3 py-1.5 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, location, style..." value={q} onChange={(e) => setQ(e.target.value)} className="border-0 focus-visible:ring-0 h-9" />
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
            ) : filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.display_name || "U"}`} alt="" className="h-9 w-9 rounded-full object-cover bg-muted" />
                    <div><p className="text-sm font-medium">{u.display_name || "Unnamed"}</p><p className="text-xs text-muted-foreground">{u.age ? `${u.age} yrs` : "Age unknown"}</p></div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.location || "—"}</TableCell>
                <TableCell>{u.verification_badge ? <Badge variant="outline" className="text-emerald-600 border-emerald-200 gap-1"><Shield className="h-3 w-3" /> Verified</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                <TableCell><span className="inline-flex items-center gap-1 text-sm"><Star className="h-3 w-3 text-amber-500" /> {getRating(u.user_id)}</span></TableCell>
                <TableCell>{u.is_blocked ? <Badge variant="outline" className="text-destructive border-destructive/30">Blocked</Badge> : <Badge variant="outline" className="text-emerald-600 border-emerald-200">Active</Badge>}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => setSelected(u)} className="gap-1"><Eye className="h-3 w-3" /> View</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleBlock(u)} className="gap-1">{u.is_blocked ? <><CheckCircle2 className="h-3 w-3" /> Unblock</> : <><Ban className="h-3 w-3" /> Block</>}</Button>
                  <Button size="sm" variant="outline" onClick={() => deleteUser(u)} className="gap-1 text-destructive border-destructive/30"><Trash2 className="h-3 w-3" /> Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>User profile details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img src={selected.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${selected.display_name || "U"}`} alt="" className="h-14 w-14 rounded-full bg-muted object-cover" />
                <div><p className="font-heading text-xl font-semibold">{selected.display_name || "Unnamed"}</p><p className="text-sm text-muted-foreground">{selected.location || "No location"} · {selected.travel_style || "standard"}</p></div>
              </div>
              <p className="text-sm text-muted-foreground">{selected.bio || "No bio provided."}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-xl border border-border p-3"><p className="text-muted-foreground">Verified</p><p className="font-medium">{selected.verification_badge ? "Yes" : "No"}</p></div>
                <div className="rounded-xl border border-border p-3"><p className="text-muted-foreground">Rating</p><p className="font-medium">{getRating(selected.user_id)}</p></div>
                <div className="rounded-xl border border-border p-3"><p className="text-muted-foreground">Reviews</p><p className="font-medium">{getUserReviews(selected.user_id).length}</p></div>
                <div className="rounded-xl border border-border p-3"><p className="text-muted-foreground">Status</p><p className="font-medium">{selected.is_blocked ? "Blocked" : "Active"}</p></div>
              </div>
              <div className="space-y-2">
                {getUserReviews(selected.user_id).slice(0, 5).map((r) => <div key={r.id} className="rounded-xl border border-border p-3 text-sm"><p className="font-medium">{r.rating}/5</p><p className="text-muted-foreground">{r.comment || "No comment"}</p></div>)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
