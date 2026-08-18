import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Heart, MessageCircle, Mail, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const PREFS_KEY = "tripmate_notif_prefs";
const SETTINGS_KEY = "tripmate_settings";

type AlertsPrefs = {
  match_alerts: boolean;
  message_alerts: boolean;
  trip_alerts: boolean;
};

type DeliverySettings = {
  push_notifications: boolean;
  email_notifications: boolean;
  dark_mode: boolean;
};

const DEFAULT_ALERTS: AlertsPrefs = {
  match_alerts: true,
  message_alerts: true,
  trip_alerts: true,
};

const DEFAULT_DELIVERY: DeliverySettings = {
  push_notifications: true,
  email_notifications: true,
  dark_mode: false,
};

export default function NotificationSettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<AlertsPrefs>(DEFAULT_ALERTS);
  const [delivery, setDelivery] = useState<DeliverySettings>(DEFAULT_DELIVERY);

  useEffect(() => {
    // Load activity alerts prefs
    const rawAlerts = localStorage.getItem(PREFS_KEY);
    if (rawAlerts) {
      try {
        setAlerts({ ...DEFAULT_ALERTS, ...JSON.parse(rawAlerts) });
      } catch (error) {
        console.warn("Failed to parse alerts preferences:", error);
      }
    }

    // Load channel delivery settings
    const rawDelivery = localStorage.getItem(SETTINGS_KEY);
    if (rawDelivery) {
      try {
        setDelivery({ ...DEFAULT_DELIVERY, ...JSON.parse(rawDelivery) });
      } catch (error) {
        console.warn("Failed to parse delivery preferences:", error);
      }
    }
  }, []);

  const updateAlert = (key: keyof AlertsPrefs, value: boolean) => {
    const next = { ...alerts, [key]: value };
    setAlerts(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    toast.success(t("settings.saved", "Saved"));
  };

  const updateDelivery = (key: keyof DeliverySettings, value: boolean) => {
    const next = { ...delivery, [key]: value };
    setDelivery(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    toast.success(t("settings.saved", "Saved"));
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading text-lg font-bold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" /> {t("settings.notification_settings", "Notification Settings")}
        </h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Section 1: Travel Activity Alerts */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            {t("settings.activity_alerts", "Activity Alerts")}
          </h2>
          <div className="rounded-2xl bg-card border border-border/80 shadow-sm divide-y divide-border/60">
            <div className="flex items-center gap-3 p-4">
              <div className="h-9 w-9 rounded-xl bg-pink-500/10 flex items-center justify-center shrink-0">
                <Heart className="h-4.5 w-4.5 text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t("settings.match_alerts", "Match alerts")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.match_alerts_desc", "When someone matches with you")}</p>
              </div>
              <Switch checked={alerts.match_alerts} onCheckedChange={(v) => updateAlert("match_alerts", v)} />
            </div>

            <div className="flex items-center gap-3 p-4">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t("settings.message_alerts", "Message alerts")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.message_alerts_desc", "New chat messages")}</p>
              </div>
              <Switch checked={alerts.message_alerts} onCheckedChange={(v) => updateAlert("message_alerts", v)} />
            </div>

            <div className="flex items-center gap-3 p-4">
              <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-4.5 w-4.5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t("settings.trip_alerts", "Trip update alerts")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.trip_alerts_desc", "Join requests and trip changes")}</p>
              </div>
              <Switch checked={alerts.trip_alerts} onCheckedChange={(v) => updateAlert("trip_alerts", v)} />
            </div>
          </div>
        </div>

        {/* Section 2: Delivery Channels */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            {t("settings.delivery_channels", "Delivery Channels")}
          </h2>
          <div className="rounded-2xl bg-card border border-border/80 shadow-sm divide-y divide-border/60">
            <div className="flex items-center gap-3 p-4">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t("settings.push_notifications", "Push notifications")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.push_desc", "Get notified about matches and messages")}</p>
              </div>
              <Switch checked={delivery.push_notifications} onCheckedChange={(v) => updateDelivery("push_notifications", v)} />
            </div>

            <div className="flex items-center gap-3 p-4">
              <div className="h-9 w-9 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0">
                <Mail className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t("settings.email_notifications", "Email notifications")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.email_desc", "Weekly digest and trip updates")}</p>
              </div>
              <Switch checked={delivery.email_notifications} onCheckedChange={(v) => updateDelivery("email_notifications", v)} />
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-4">
          NeverASolo · Notification Settings
        </p>
      </div>
    </div>
  );
}
