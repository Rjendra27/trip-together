import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  variant?: "compact" | "full";
}

export default function LanguageSelector({ variant = "full" }: Props) {
  const { i18n, t } = useTranslation();
  const { user } = useAuth();

  const handleChange = async (lang: string) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem("tripmate_lang", lang);
    if (user) {
      await supabase
        .from("profiles")
        .update({ preferred_language: lang })
        .eq("user_id", user.id);
    }
  };

  return (
    <Select value={i18n.language?.split("-")[0] || "en"} onValueChange={handleChange}>
      <SelectTrigger className={variant === "compact" ? "h-9 w-auto gap-2 rounded-full" : "w-full"}>
        <Globe className="h-4 w-4 text-primary" />
        <SelectValue placeholder={t("common.select_language")} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {SUPPORTED_LANGUAGES.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            <span className="font-medium">{l.native}</span>
            <span className="ml-2 text-xs text-muted-foreground">{l.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
