import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, Loader2, X } from "lucide-react";
import { z } from "zod";

const SUGGESTED = ["Trekking", "Photography", "Food", "Culture", "Beach", "Nightlife", "Hiking", "Surfing", "Museums", "Wildlife"];
const SUGGESTED_LANGS = ["English", "Hindi", "Spanish", "French", "German", "Mandarin", "Japanese", "Arabic", "Portuguese", "Italian"];
const GROUP_SIZES = ["Solo", "2-3", "4-6", "7+"];
const BUDGETS = ["Budget", "Standard", "Premium", "Luxury"];

const schema = z.object({
  display_name: z.string().trim().min(1, "Name is required").max(60, "Max 60 chars"),
  bio: z.string().trim().max(500, "Max 500 chars").optional(),
  location: z.string().trim().max(100, "Max 100 chars").optional(),
  age: z.number().int().min(18, "Must be 18+").max(120).optional().nullable(),
});

interface Profile {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  age: number | null;
  interests: string[] | null;
  avatar_url: string | null;
  languages?: string[] | null;
  preferred_group_size?: string | null;
  budget_preference?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: Profile;
  onSaved: () => void;
}

export default function EditProfileDialog({ open, onOpenChange, profile, onSaved }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [age, setAge] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setAge(profile.age?.toString() ?? "");
      setInterests(profile.interests ?? []);
      setAvatarUrl(profile.avatar_url);
    }
  }, [open, profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.user_id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleInterest = (i: string) => {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const handleSave = async () => {
    const parsed = schema.safeParse({
      display_name: displayName,
      bio: bio || undefined,
      location: location || undefined,
      age: age ? parseInt(age) : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: parsed.data.display_name,
          bio: parsed.data.bio ?? null,
          location: parsed.data.location ?? null,
          age: parsed.data.age,
          interests,
          avatar_url: avatarUrl,
        })
        .eq("user_id", profile.user_id);
      if (error) throw error;
      toast.success("Profile updated");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-24 w-24 rounded-2xl object-cover shadow-card" />
              ) : (
                <div className="h-24 w-24 rounded-2xl bg-muted flex items-center justify-center text-3xl">👤</div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">Tap camera to change photo</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={60} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={500} placeholder="Tell others about yourself..." />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="loc">Location</Label>
              <Input id="loc" value={location} onChange={e => setLocation(e.target.value)} maxLength={100} placeholder="City" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="age">Age</Label>
              <Input id="age" type="number" value={age} onChange={e => setAge(e.target.value)} min={18} max={120} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Interests</Label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map(i => {
                const active = interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleInterest(i)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {i}
                    {active && <X className="inline h-3 w-3 ml-1" />}
                  </button>
                );
              })}
            </div>
            {interests.length > 0 && (
              <p className="text-xs text-muted-foreground">{interests.length} selected</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
