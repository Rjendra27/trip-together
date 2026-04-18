import { useEffect, useState } from "react";
import { Search, Trash2, Pencil, X } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AdminTrips() {
  const [trips, setTrips] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("trips").select("*").order("created_at", { ascending: false });
    setTrips(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this trip?")) return;
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Trip deleted");
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("trips").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Trip cancelled");
    load();
  };

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("trips")
      .update({
        destination: editing.destination,
        start_date: editing.start_date,
        end_date: editing.end_date,
        budget_min: editing.budget_min,
        budget_max: editing.budget_max,
        description: editing.description,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Trip updated");
    setEditing(null);
    load();
  };

  const filtered = trips.filter((t) =>
    t.destination?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AdminLayout title="Trips">
      <div className="flex items-center gap-2 mb-4 bg-card border border-border rounded-xl px-3 py-1.5 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by destination..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border-0 focus-visible:ring-0 h-9"
        />
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Destination</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Spots</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No trips found</TableCell></TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.destination}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.start_date} → {t.end_date}
                  </TableCell>
                  <TableCell className="text-sm">${t.budget_min}–${t.budget_max}</TableCell>
                  <TableCell className="text-sm">{t.spots_filled}/{t.spots_needed}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(t)} className="gap-1">
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    {t.status !== "cancelled" && (
                      <Button size="sm" variant="outline" onClick={() => cancel(t.id)} className="gap-1">
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => remove(t.id)} className="gap-1 text-destructive border-destructive/30">
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Trip</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Destination</Label>
                <Input value={editing.destination} onChange={(e) => setEditing({ ...editing, destination: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start</Label>
                  <Input type="date" value={editing.start_date} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End</Label>
                  <Input type="date" value={editing.end_date} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Budget min</Label>
                  <Input type="number" value={editing.budget_min ?? 0} onChange={(e) => setEditing({ ...editing, budget_min: +e.target.value })} />
                </div>
                <div>
                  <Label>Budget max</Label>
                  <Input type="number" value={editing.budget_max ?? 0} onChange={(e) => setEditing({ ...editing, budget_max: +e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
