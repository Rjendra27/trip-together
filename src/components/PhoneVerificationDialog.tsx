import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, Phone, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  onVerified: () => void;
}

const COOLDOWN = 60;
// E.164 format: +[country][number], 8-15 digits total
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

export default function PhoneVerificationDialog({ open, onOpenChange, userId, onVerified }: Props) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep("phone");
      setOtp("");
      setSending(false);
      setVerifying(false);
    }
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async () => {
    if (!PHONE_RE.test(phone)) {
      toast.error("Use international format, e.g. +14155551234");
      return;
    }
    if (cooldown > 0) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: "sms" },
      });
      if (error) throw error;
      toast.success("OTP sent to your phone");
      setStep("otp");
      setCooldown(COOLDOWN);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send OTP");
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });
      if (error) throw error;

      const { error: upErr } = await supabase
        .from("profiles")
        .update({ phone_number: phone, phone_verified: true, verification_badge: true })
        .eq("user_id", userId);
      if (upErr) throw upErr;

      toast.success("Phone verified! 🎉");
      onVerified();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Invalid code");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "phone" ? <Phone className="h-5 w-5 text-primary" /> : <ShieldCheck className="h-5 w-5 text-accent" />}
            {step === "phone" ? "Verify your phone" : "Enter the code"}
          </DialogTitle>
          <DialogDescription>
            {step === "phone"
              ? "We'll send a 6-digit code via SMS to confirm it's you."
              : `Enter the 6-digit code sent to ${phone}`}
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+14155551234"
                value={phone}
                onChange={e => setPhone(e.target.value.trim())}
                maxLength={16}
              />
              <p className="text-xs text-muted-foreground">Include country code (e.g. +1, +44)</p>
            </div>
            <Button onClick={sendOtp} disabled={sending || cooldown > 0} className="w-full">
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Send OTP"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center py-2">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={verifyOtp} disabled={verifying || otp.length !== 6} className="w-full">
              {verifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify
            </Button>
            <div className="flex justify-between text-xs">
              <button onClick={() => setStep("phone")} className="text-muted-foreground hover:text-foreground">
                ← Change number
              </button>
              <button
                onClick={sendOtp}
                disabled={cooldown > 0 || sending}
                className="text-primary disabled:text-muted-foreground"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
