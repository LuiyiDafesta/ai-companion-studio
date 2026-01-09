import { AlertTriangle, Trash2, RefreshCw, Database, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const AdminDangerZone = () => {
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState('');

  const handlePurgeData = () => {
    toast({
      title: "Data purged",
      description: "All test data has been removed.",
      variant: "destructive",
    });
    setConfirmText('');
  };

  const handleSystemReset = () => {
    toast({
      title: "System reset initiated",
      description: "The system is being reset to default state.",
      variant: "destructive",
    });
    setConfirmText('');
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Danger Zone</h1>
            <p className="text-muted-foreground">
              Destructive actions for testing environments only
            </p>
          </div>
        </div>

        <Card className="bg-card border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">⚠️ Warning</CardTitle>
            <CardDescription>
              The actions on this page are destructive and cannot be undone. 
              Only use these in testing environments.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Backup
            </CardTitle>
            <CardDescription>
              Create a full backup of the database before performing destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Backup
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Purge Test Data
            </CardTitle>
            <CardDescription>
              Remove all test users, agents, and conversations. Keeps system configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Type "PURGE DATA" to confirm</Label>
              <Input 
                placeholder="PURGE DATA"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={confirmText !== 'PURGE DATA'}
                >
                  Purge All Test Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Purge all test data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all users, agents, documents, and conversations.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handlePurgeData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Purge Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Card className="bg-card border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <RefreshCw className="w-5 h-5" />
              Full System Reset
            </CardTitle>
            <CardDescription>
              Reset the entire system to factory defaults. All data will be lost.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                This action will:
              </p>
              <ul className="list-disc list-inside text-sm text-destructive/80 mt-2 space-y-1">
                <li>Delete all users and their data</li>
                <li>Remove all AI agents and training data</li>
                <li>Clear all documents and vector embeddings</li>
                <li>Reset all system configurations</li>
                <li>Revoke all API keys and webhooks</li>
              </ul>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Entire System
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently reset the entire system. All data, configurations, 
                    and settings will be lost forever. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleSystemReset}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDangerZone;
