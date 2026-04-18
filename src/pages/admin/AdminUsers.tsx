import { useEffect, useState } from "react";
import { Search, Shield, Ban, CheckCircle2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleBlock = async (u: any) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_blocked: !u.is_blocked })
      .eq("user_id", u.user_id);
    if (error) return toast.error(error.message);
    toast.success(u.is_blocked ? "User unblocked" : "User blocked");
    load();
  };

  const filtered = users.filter((u) =>
    [u.display_name, u.location].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AdminLayout title="Users">
      <div className="flex items-center gap-2 mb-4 bg-card border border-border rounded-xl px-3 py-1.5 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or location..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border-0 focus-visible:ring-0 h-9"
        />
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.display_name || "U"}`}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover bg-muted"
                      />
                      <div>
                        <p className="text-sm font-medium">{u.display_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{u.age ? `${u.age} yrs` : "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.location || "—"}</TableCell>
                  <TableCell>
                    {u.verification_badge ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 gap-1">
                        <Shield className="h-3 w-3" /> Verified
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.is_blocked ? (
                      <Badge variant="outline" className="text-destructive border-destructive/30">Blocked</Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => toggleBlock(u)} className="gap-1">
                      {u.is_blocked ? <><CheckCircle2 className="h-3 w-3" /> Unblock</> : <><Ban className="h-3 w-3" /> Block</>}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
