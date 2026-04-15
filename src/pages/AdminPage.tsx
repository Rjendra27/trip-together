import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Flag, Shield, Activity, Search, ChevronRight, Ban, Check, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Users", "Reports"];

const SAMPLE_USERS = [
  { id: "1", name: "Emma Johnson", email: "emma@email.com", verified: true, trips: 5, status: "active", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" },
  { id: "2", name: "James Smith", email: "james@email.com", verified: true, trips: 3, status: "active", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face" },
  { id: "3", name: "Mia Davis", email: "mia@email.com", verified: false, trips: 1, status: "suspended", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" },
];

const SAMPLE_REPORTS = [
  { id: "1", reporter: "Emma", reported: "FakeUser123", reason: "Fake profile", status: "pending", date: "Today" },
  { id: "2", reporter: "James", reported: "SpamBot", reason: "Spam", status: "reviewing", date: "Yesterday" },
  { id: "3", reporter: "Carlos", reported: "BadActor", reason: "Harassment", status: "resolved", date: "3 days ago" },
];

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-200",
  reviewing: "bg-primary/10 text-primary border-primary/20",
  resolved: "bg-accent/10 text-accent border-accent/20",
  dismissed: "bg-muted text-muted-foreground border-border",
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3">
          <h1 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Admin Dashboard
          </h1>
        </div>
        <div className="flex gap-1 px-4 pb-2">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {activeTab === "Overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Users", value: "1,247", icon: Users, color: "text-primary bg-primary/10" },
                { label: "Active Trips", value: "89", icon: Activity, color: "text-accent bg-accent/10" },
                { label: "Open Reports", value: "12", icon: Flag, color: "text-destructive bg-destructive/10" },
                { label: "Verified Users", value: "834", icon: Shield, color: "text-accent bg-accent/10" },
              ].map(stat => (
                <div key={stat.label} className="rounded-2xl bg-card p-4 shadow-card">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-2", stat.color)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <p className="font-heading text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
              <h3 className="font-heading text-sm font-semibold">Recent Reports</h3>
              {SAMPLE_REPORTS.slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{r.reported}</p>
                    <p className="text-xs text-muted-foreground">{r.reason}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", statusColor[r.status])}>{r.status}</Badge>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "Users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex gap-2 items-center bg-secondary rounded-xl p-1.5">
              <Search className="h-4 w-4 text-muted-foreground ml-1.5" />
              <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="border-0 bg-transparent focus-visible:ring-0 text-sm h-8" />
            </div>
            <div className="space-y-2">
              {SAMPLE_USERS.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card shadow-card">
                  <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{user.name}</p>
                      {user.verified && <Shield className="h-3.5 w-3.5 text-accent" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email} · {user.trips} trips</p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", user.status === "active" ? "text-accent border-accent/20" : "text-destructive border-destructive/20")}>{user.status}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "Reports" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {SAMPLE_REPORTS.map(report => (
              <div key={report.id} className="rounded-2xl bg-card p-4 shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{report.reported}</p>
                    <p className="text-xs text-muted-foreground">Reported by {report.reporter} · {report.date}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", statusColor[report.status])}>{report.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{report.reason}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs"><Eye className="h-3 w-3" />Review</Button>
                  <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs text-destructive border-destructive/20"><Ban className="h-3 w-3" />Ban</Button>
                  <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs text-accent border-accent/20"><Check className="h-3 w-3" />Dismiss</Button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
