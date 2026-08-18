import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LanguageSelector from "@/components/LanguageSelector";
import heroImage from "@/assets/hero-travel.jpg";

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            toast({
              title: "Email Verification Required",
              description: "Please check your inbox at your email address and click the verification link before logging in.",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Registration Successful",
          description: "We sent you a verification link. Please check your inbox and verify your email before logging in.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Enter your email", description: "Type your email above first, then tap Forgot password.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Check your email", description: "We sent you a password reset link." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative h-56 overflow-hidden">
        <img src={heroImage} alt="Travel" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/30 to-foreground/70" />
        <div className="absolute top-3 right-3 z-10">
          <LanguageSelector variant="compact" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-heading text-4xl font-bold text-primary-foreground">
            TripMate
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-primary-foreground/80 text-sm mt-1">
            Never travel alone again
          </motion.p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex-1 -mt-6 rounded-t-3xl bg-background px-6 pt-8 pb-6">
        <h2 className="font-heading text-xl font-bold mb-6">{isLogin ? "Welcome back" : "Create account"}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Your name" value={fullName} onChange={e => setFullName(e.target.value)} className="rounded-xl h-11 pl-10" required />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="hello@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl h-11 pl-10" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="••••••••" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="rounded-xl h-11 pl-10 pr-10" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isLogin && (
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-primary font-medium"
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
          )}
          <Button type="submit" variant="hero" className="w-full rounded-xl h-12 mt-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>


        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold">{isLogin ? "Sign up" : "Sign in"}</button>
        </p>
      </motion.div>
    </div>
  );
}
