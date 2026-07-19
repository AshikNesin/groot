import { AppSettings } from "@groot/shell/components/AppSettings";
import { PasskeyManager } from "@groot/shell/components/PasskeyManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@groot/ui/tabs";
import { PageLayout } from "@groot/shell/components/layout/PageLayout";
import { Settings as SettingsIcon, ShieldCheck } from "lucide-react";

export function Settings() {
  return (
    <PageLayout
      title="Settings"
      description="Manage your application preferences, configuration, and security."
      maxWidth="6xl"
    >
      <Tabs defaultValue="general">
        <TabsList variant="line">
          <TabsTrigger value="general">
            <SettingsIcon className="size-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck className="size-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <AppSettings />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <PasskeyManager />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
