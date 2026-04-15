import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, Ban, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface ReportBlockDialogProps {
  open: boolean;
  onClose: () => void;
  userName: string;
}

const REASONS = ["Harassment", "Fake profile", "Inappropriate content", "Spam", "Safety concern", "Other"];

export default function ReportBlockDialog({ open, onClose, userName }: ReportBlockDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const handleReport = () => {
    toast({ title: "Report submitted", description: `${userName} has been reported. We'll review it soon.` });
    onClose();
  };

  const handleBlock = () => {
    toast({ title: "User blocked", description: `${userName} has been blocked. They won't be able to contact you.` });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm p-4">
          <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="w-full max-w-md rounded-3xl bg-card p-6 space-y-4 shadow-elevated">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold">Report or Block</h2>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedReason(r)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                    selectedReason === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <Textarea placeholder="Additional details (optional)..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />

            <div className="flex gap-3">
              <Button variant="destructive" className="flex-1 rounded-xl gap-2" onClick={handleReport} disabled={!selectedReason}>
                <Flag className="h-4 w-4" /> Report
              </Button>
              <Button variant="outline" className="flex-1 rounded-xl gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={handleBlock}>
                <Ban className="h-4 w-4" /> Block
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
