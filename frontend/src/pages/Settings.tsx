
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#222222] mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* Profile Settings */}
          <Card className="p-8 rounded-2xl border border-gray-200">
            <h3 className="text-2xl font-bold text-[#222222] mb-6">Profile Settings</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name" className="text-[#222222] font-medium">Full Name</Label>
                <Input id="name" defaultValue="Alex Johnson" className="mt-2 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="email" className="text-[#222222] font-medium">Email</Label>
                <Input id="email" defaultValue="alex@company.com" className="mt-2 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="company" className="text-[#222222] font-medium">Company</Label>
                <Input id="company" defaultValue="Tech Startup Inc." className="mt-2 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="role" className="text-[#222222] font-medium">Role</Label>
                <Input id="role" defaultValue="Marketing Manager" className="mt-2 rounded-xl" />
              </div>
            </div>
            <Button className="mt-6 bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold">
              Save Changes
            </Button>
          </Card>

          {/* Notification Preferences */}
          <Card className="p-8 rounded-2xl border border-gray-200">
            <h3 className="text-2xl font-bold text-[#222222] mb-6">Notifications</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#222222]">Email Notifications</div>
                  <div className="text-gray-600">Receive updates about campaigns and responses</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#222222]">Creator Responses</div>
                  <div className="text-gray-600">Get notified when creators respond to outreach</div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#222222]">Weekly Reports</div>
                  <div className="text-gray-600">Receive weekly performance summaries</div>
                </div>
                <Switch />
              </div>
            </div>
          </Card>

          {/* API Settings */}
          <Card className="p-8 rounded-2xl border border-gray-200">
            <h3 className="text-2xl font-bold text-[#222222] mb-6">API & Integrations</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="api-key" className="text-[#222222] font-medium">API Key</Label>
                <Input 
                  id="api-key" 
                  defaultValue="sk-1234567890abcdef..." 
                  className="mt-2 rounded-xl font-mono text-sm" 
                  readOnly 
                />
              </div>
              <Button variant="outline" className="rounded-xl">
                Regenerate API Key
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
