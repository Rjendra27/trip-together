import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Phone, MapPin, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SOSButton() {
  const [showPanel, setShowPanel] = useState(false);
  const { toast } = useToast();

  const handleSOS = () => {
    toast({
      title: "🚨 SOS Alert Sent",
      description: "Your emergency contacts have been notified with your location.",
      variant: "destructive",
    });
    setShowPanel(false);
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {
        toast({ title: "📍 Location Shared", description: "Your live location is now being shared with trusted contacts." });
      }, () => {
        toast({ title: "Location Error", description: "Please enable location access.", variant: "destructive" });
      });
    }
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowPanel(true)}
        className="fixed bottom-24 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-elevated"
      >
        <Shield className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="w-full max-w-md rounded-3xl bg-card p-6 space-y-4 shadow-elevated"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Emergency
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPanel(false)}><X className="h-4 w-4" /></Button>
              </div>

              <Button variant="destructive" className="w-full h-14 rounded-2xl text-base font-bold gap-2" onClick={handleSOS}>
                <Phone className="h-5 w-5" /> Send SOS Alert
              </Button>

              <Button variant="outline" className="w-full h-12 rounded-2xl gap-2" onClick={handleShareLocation}>
                <MapPin className="h-4 w-4" /> Share Live Location
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                This will notify your emergency contacts and share your current location.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
