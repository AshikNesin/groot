import { AppSettings } from "@/core/components/AppSettings";
import { PasskeyManager } from "@/core/components/PasskeyManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { PageLayout } from "@/core/components/layout/PageLayout";

export function Settings() {
  return (
    <PageLayout
      title="Settings"
      description="Manage your application preferences and configuration"
    >
      <Tabs defaultValue="app">
        <TabsList>
          <TabsTrigger value="app">App Settings</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="app" className="space-y-4 mt-6">
          <AppSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-6">
          <PasskeyManager />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
