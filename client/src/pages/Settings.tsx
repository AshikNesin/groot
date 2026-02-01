import { AppSettings } from "@/components/AppSettings";
import { PasskeyManager } from "@/components/PasskeyManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your application preferences and configuration
        </p>
      </div>

      <Tabs defaultValue="app" className="space-y-6">
        <TabsList>
          <TabsTrigger value="app">App Settings</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="app" className="space-y-4">
          <AppSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <PasskeyManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
