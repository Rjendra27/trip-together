import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Plane, Bookmark, Shield, BadgeCheck, Phone,
  Sparkles, MoreVertical, Flag, UserX, Search, Loader2, Star, Check, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ReportBlockDialog from "@/components/ReportBlockDialog";

type MatchStatus = "New Match" | "Chatting" | "Planning Trip" | "Confirmed" | "Completed";

interface MatchRow {
  id: string;
  user_id: string;
  matched_user_id: string;
  status: string | null;
  match_percent: number | null;
  created_at: string;
  updated_at: string;
}

interface ProfileLite {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  location: string | null;
  interests: string[] | null;
  is_available: boolean | null;
  verification_badge: boolean | null;
  id_verified: boolean | null;
}

interface EnrichedMatch {
  match: MatchRow;
  peerId: string;
  profile: ProfileLite | null;
  uiStatus: MatchStatus;
  mutualInterests: string[];
  compatibility: number;
  phoneVerified: boolean;
  hasMessages: boolean;
  hasTripTogether: boolean;
  pendingJoinRequest?: {
    id: string;
    trip_id: string;
    destination: string;
    message: string | null;
    created_at: string;
  } | null;
}

const STATUS_STYLES: Record<MatchStatus, string> = {
  "New Match": "bg-primary/15 text-primary border-primary/30",
  "Chatting": "bg-accent/15 text-accent-foreground border-accent/30",
  "Planning Trip": "bg-amber-500/15 text-amber-600 border-amber-500/30",
  "Confirmed": "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  "Completed": "bg-muted text-muted-foreground border-border",
};

const ICEBREAKERS = [
  "Hey! Saw we're heading the same way — what's your itinerary looking like?",
  "Your travel vibe matches mine 🌍 — what's on your bucket list?",
  "Solo or group? Would love to swap travel tips!",
  "Big foodie or street-food adventurer? 🍜",
  "If we team up, what's the one place we *have* to hit?",
];

function pickIcebreaker(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ICEBREAKERS[Math.abs(h) % ICEBREAKERS.length];
}

export default function MatchesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [reportFor, setReportFor] = useState<{ name: string; userId: string } | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    const { data: matchRows } = await supabase
      .from("matches")
      .select("*")
      .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (!matchRows || matchRows.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const peerIds = Array.from(
      new Set(matchRows.map(m => (m.user_id === user.id ? m.matched_user_id : m.user_id)))
    );

    const [
      { data: profiles },
      { data: contacts },
      { data: myProfile },
      { data: msgs },
      { data: trips },
      { data: joinRequests },
      { data: myTrips }
    ] = await Promise.all([
      supabase.from("profiles").select("user_id,display_name,avatar_url,bio,age,location,interests,is_available,verification_badge,id_verified").in("user_id", peerIds),
      supabase.from("user_contacts").select("user_id,phone_verified").in("user_id", peerIds),
      supabase.from("profiles").select("interests").eq("user_id", user.id).maybeSingle(),
      supabase.from("messages").select("sender_id,receiver_id").or(`and(sender_id.eq.${user.id},receiver_id.in.(${peerIds.join(",")})),and(receiver_id.eq.${user.id},sender_id.in.(${peerIds.join(",")}))`),
      supabase.from("trips").select("user_id,completed,end_date").in("user_id", peerIds),
      supabase.from("trip_join_requests").select("*").eq("trip_owner_id", user.id).eq("status", "pending"),
      supabase.from("trips").select("id,destination").eq("user_id", user.id)
    ]);

    const myInterests: string[] = (myProfile?.interests as string[]) || [];
    const phoneMap = new Map((contacts || []).map((c: any) => [c.user_id, !!c.phone_verified]));
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p as ProfileLite]));
    const msgPeers = new Set<string>();
    (msgs || []).forEach((m: any) => {
      msgPeers.add(m.sender_id === user.id ? m.receiver_id : m.sender_id);
    });
    const tripsByUser = new Map<string, any[]>();
    (trips || []).forEach((t: any) => {
      if (!tripsByUser.has(t.user_id)) tripsByUser.set(t.user_id, []);
      tripsByUser.get(t.user_id)!.push(t);
    });

    const tripMap = new Map((myTrips || []).map(t => [t.id, t.destination]));

    const enriched: EnrichedMatch[] = matchRows.map(m => {
      const peerId = m.user_id === user.id ? m.matched_user_id : m.user_id;
      const profile = profileMap.get(peerId) || null;
      const peerInterests = profile?.interests || [];
      const mutualInterests = peerInterests.filter(i => myInterests.includes(i));
      const compatibility = m.match_percent ?? 50;
      const hasMessages = msgPeers.has(peerId);
      const peerTrips = tripsByUser.get(peerId) || [];
      const hasUpcoming = peerTrips.some(t => !t.completed && new Date(t.end_date) >= new Date());
      const hasCompleted = peerTrips.some(t => t.completed || new Date(t.end_date) < new Date());

      let uiStatus: MatchStatus = "New Match";
      if (m.status === "accepted") {
        if (hasCompleted && !hasUpcoming) uiStatus = "Completed";
        else if (hasUpcoming) uiStatus = "Confirmed";
        else if (hasMessages) uiStatus = "Chatting";
        else uiStatus = "New Match";
      } else if (hasMessages) {
        uiStatus = "Planning Trip";
      }

      const matchedRequest = (joinRequests || []).find(r => r.requester_id === peerId);
      const pendingJoinRequest = matchedRequest ? {
        id: matchedRequest.id,
        trip_id: matchedRequest.trip_id,
        destination: tripMap.get(matchedRequest.trip_id) || "your trip",
        message: matchedRequest.message,
        created_at: matchedRequest.created_at,
      } : null;

      return {
        match: m as MatchRow,
        peerId,
        profile,
        uiStatus,
        mutualInterests,
        compatibility,
        phoneVerified: phoneMap.get(peerId) === true,
        hasMessages,
        hasTripTogether: hasUpcoming,
        pendingJoinRequest,
      };
    });

    setMatches(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("matches-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchMatches())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchMatches())
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_join_requests" }, () => fetchMatches())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchMatches]);

  const handleAcceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("trip_join_requests")
      .update({ status: "accepted" as any })
      .eq("id", requestId);

    if (error) {
      toast({ title: "Could not accept request", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Request accepted! 🎉", description: "They have been added to your trip." });
    fetchMatches();
  };

  const handleDeclineRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("trip_join_requests")
      .update({ status: "rejected" as any })
      .eq("id", requestId);

    if (error) {
      toast({ title: "Could not decline request", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Request declined", description: "The trip request has been rejected." });
    fetchMatches();
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return matches;
    const q = search.toLowerCase();
    return matches.filter(m =>
      (m.profile?.display_name || "").toLowerCase().includes(q) ||
      (m.profile?.location || "").toLowerCase().includes(q) ||
      m.mutualInterests.some(i => i.toLowerCase().includes(q))
    );
  }, [matches, search]);

  const handleMessage = (peerId: string, name: string) => {
    const ice = pickIcebreaker(peerId);
    navigator.clipboard?.writeText(ice).catch(() => {});
    toast({ title: `Opening chat with ${name}`, description: `Icebreaker copied: "${ice}"` });
    navigate("/chat");
  };

  const handleInvite = (name: string) => {
    toast({ title: "Invite sent ✈️", description: `${name} will see your trip invite shortly.` });
    navigate("/trips");
  };

  const handleSave = (matchId: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      next.has(matchId) ? next.delete(matchId) : next.add(matchId);
      return next;
    });
    toast({ title: savedIds.has(matchId) ? "Removed from saved" : "Saved match" });
  };

  const handleUnmatch = async (m: EnrichedMatch) => {
    const { error } = await supabase.from("matches").update({ status: "rejected" as any }).eq("id", m.match.id);
    if (error) {
      toast({ title: "Couldn't unmatch", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Unmatched", description: `${m.profile?.display_name || "User"} removed from matches.` });
    fetchMatches();
  };

  const handleBlock = async (m: EnrichedMatch) => {
    if (!user) return;
    const { error } = await supabase.from("blocked_users").insert({
      user_id: user.id,
      blocked_user_id: m.peerId,
    });
    if (error) {
      toast({ title: "Couldn't block", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "User blocked" });
    handleUnmatch(m);
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Matches
          </h1>
          <Badge variant="secondary" className="rounded-full">{matches.length}</Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, place, interests…"
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      <div className="px-4 mt-4">
        {!user ? (
          <EmptyState
            title="Sign in to see matches"
            subtitle="Your travel buddies will appear here once you sign in."
            cta={<Button variant="gradient" onClick={() => navigate("/auth")}>Sign in</Button>}
          />
        ) : loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matches yet"
            subtitle="Create a trip or browse travelers to start matching."
            cta={<Button variant="gradient" onClick={() => navigate("/trips")}>Browse trips</Button>}
          />
        ) : (
          <div className="grid gap-3">
            <AnimatePresence>
              {filtered.map(m => (
                <MatchCard
                  key={m.match.id}
                  m={m}
                  saved={savedIds.has(m.match.id)}
                  onMessage={() => handleMessage(m.peerId, m.profile?.display_name || "Traveler")}
                  onInvite={() => handleInvite(m.profile?.display_name || "Traveler")}
                  onSave={() => handleSave(m.match.id)}
                  onUnmatch={() => handleUnmatch(m)}
                  onReport={() => setReportFor({ name: m.profile?.display_name || "User", userId: m.peerId })}
                  onBlock={() => handleBlock(m)}
                  onAcceptRequest={() => handleAcceptRequest(m.pendingJoinRequest!.id)}
                  onDeclineRequest={() => handleDeclineRequest(m.pendingJoinRequest!.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ReportBlockDialog
        open={!!reportFor}
        onClose={() => setReportFor(null)}
        userName={reportFor?.name || ""}
      />
    </div>
  );
}

function EmptyState({ title, subtitle, cta }: { title: string; subtitle: string; cta?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-20"
    >
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <p className="font-heading text-lg font-semibold mb-1">{title}</p>
      <p className="text-muted-foreground text-sm mb-5 max-w-xs">{subtitle}</p>
      {cta}
    </motion.div>
  );
}

function MatchCard({
  m, saved, onMessage, onInvite, onSave, onUnmatch, onReport, onBlock, onAcceptRequest, onDeclineRequest,
}: {
  m: EnrichedMatch;
  saved: boolean;
  onMessage: () => void;
  onInvite: () => void;
  onSave: () => void;
  onUnmatch: () => void;
  onReport: () => void;
  onBlock: () => void;
  onAcceptRequest: () => void;
  onDeclineRequest: () => void;
}) {
  const name = m.profile?.display_name || "Traveler";
  const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const trusted = !!(m.profile?.verification_badge || m.profile?.id_verified);
  const available = m.profile?.is_available !== false;
  const icebreaker = pickIcebreaker(m.peerId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl bg-card border border-border shadow-card p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-14 w-14">
            <AvatarImage src={m.profile?.avatar_url || undefined} alt={name} />
            <AvatarFallback>{initials || "?"}</AvatarFallback>
          </Avatar>
          <span
            className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card ${
              available ? "bg-emerald-500" : "bg-muted-foreground"
            }`}
            aria-label={available ? "Available" : "Unavailable"}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-semibold truncate">
              {name}{m.profile?.age ? `, ${m.profile.age}` : ""}
            </h3>
            <span className={`text-[10px] font-semibold rounded-full border px-2 py-0.5 ${STATUS_STYLES[m.uiStatus]}`}>
              {m.uiStatus}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            {m.profile?.location && <span className="truncate">{m.profile.location}</span>}
            <span className="ml-auto flex items-center gap-1 text-amber-500 font-semibold">
              <Star className="h-3.5 w-3.5 fill-current" /> {m.compatibility}%
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {trusted && (
              <Badge variant="secondary" className="text-[10px] gap-1"><BadgeCheck className="h-3 w-3" /> Trusted Traveler</Badge>
            )}
            {m.phoneVerified && (
              <Badge variant="secondary" className="text-[10px] gap-1"><Phone className="h-3 w-3" /> Phone Verified</Badge>
            )}
            {available && (
              <Badge variant="secondary" className="text-[10px] gap-1"><Shield className="h-3 w-3" /> Available</Badge>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onUnmatch}><UserX className="h-4 w-4 mr-2" /> Unmatch</DropdownMenuItem>
            <DropdownMenuItem onClick={onReport}><Flag className="h-4 w-4 mr-2" /> Report</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBlock} className="text-destructive focus:text-destructive">
              <UserX className="h-4 w-4 mr-2" /> Block user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {m.mutualInterests.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground self-center">Mutual</span>
          {m.mutualInterests.slice(0, 6).map(tag => (
            <Badge key={tag} className="bg-primary/10 text-primary border-0 text-[11px]">{tag}</Badge>
          ))}
        </div>
      )}

      {m.pendingJoinRequest && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Pending Trip Join Request
          </div>
          <p className="text-xs text-foreground">
            Wants to join your trip to <span className="font-bold">{m.pendingJoinRequest.destination}</span>
          </p>
          {m.pendingJoinRequest.message && (
            <p className="text-xs text-muted-foreground bg-card/50 px-2.5 py-2 rounded-lg border border-border/40 italic">
              "{m.pendingJoinRequest.message}"
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              onClick={onAcceptRequest}
            >
              <Check className="h-4 w-4" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 gap-1"
              onClick={onDeclineRequest}
            >
              <X className="h-4 w-4" /> Decline
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground italic">
        💬 {icebreaker}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="default" size="sm" className="rounded-xl gap-1" onClick={onMessage}>
          <MessageCircle className="h-4 w-4" /> Message
        </Button>
        <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={onInvite}>
          <Plane className="h-4 w-4" /> Invite
        </Button>
        <Button
          variant={saved ? "secondary" : "outline"}
          size="sm"
          className="rounded-xl gap-1"
          onClick={onSave}
        >
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} /> {saved ? "Saved" : "Save"}
        </Button>
      </div>
    </motion.div>
  );
}
