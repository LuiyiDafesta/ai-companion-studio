import { AlertTriangle, Trash2, RefreshCw, Database, Download, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download backup
  const handleDownloadBackup = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await (supabase.rpc as any)('admin_export_all_data');

      if (error) throw error;

      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `agenthub_backup_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastBackup(new Date().toLocaleString());
      toast({
        title: "Backup created",
        description: "Database backup downloaded successfully.",
      });
    } catch (error: any) {
      console.error('Backup error:', error);
      toast({
        title: "Backup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Purge test data
  const handlePurgeData = async () => {
    setIsPurging(true);
    try {
      const { data, error } = await (supabase.rpc as any)('admin_purge_test_data');

      if (error) throw error;

      const counts = data as Record<string, number>;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);

      toast({
        title: "Test data purged",
        description: `Deleted ${total} records: ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
        variant: "destructive",
      });
      setConfirmText('');
    } catch (error: any) {
      console.error('Purge error:', error);
      toast({
        title: "Purge failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPurging(false);
    }
  };

  // Full system reset
  const handleSystemReset = async () => {
    setIsResetting(true);
    try {
      // First, clear the storage bucket
      const { data: files, error: listError } = await supabase.storage
        .from('ahdocuments')
        .list();

      if (!listError && files && files.length > 0) {
        const filePaths = files.map(f => f.name);
        await supabase.storage.from('ahdocuments').remove(filePaths);
      }

      // Then run the database reset
      const { data, error } = await (supabase.rpc as any)('admin_full_reset', {
        keep_admin_id: user?.id || null
      });

      if (error) throw error;

      toast({
        title: "System reset complete",
        description: "All data and files have been deleted. Your admin account was preserved.",
        variant: "destructive",
      });
      setResetConfirmText('');
    } catch (error: any) {
      console.error('Reset error:', error);
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Handle file upload for restore
  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const [isRestoring, setIsRestoring] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validate backup structure
      if (!backupData.backup_version || !backupData.tables) {
        throw new Error('Invalid backup file format');
      }

      // Call restore RPC
      const { data, error } = await (supabase.rpc as any)('admin_restore_all_data', {
        backup_data: backupData
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Backup restaurado",
          description: `Restaurados: ${data.restored.profiles} perfiles, ${data.restored.agents} agentes, ${data.restored.settings} configuraciones.`,
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Error al restaurar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
              Backup, restore, and destructive actions
            </p>
          </div>
        </div>

        <Card className="bg-card border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">⚠️ Warning</CardTitle>
            <CardDescription>
              Some actions on this page are destructive and cannot be undone.
              Always create a backup before performing destructive operations.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Backup Section */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Backup & Restore
            </CardTitle>
            <CardDescription>
              Create a full backup of all data or restore from a previous backup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleDownloadBackup} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download Backup
              </Button>

              <Button variant="outline" onClick={handleRestoreClick}>
                <Upload className="w-4 h-4 mr-2" />
                Load Backup File
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>

            {lastBackup && (
              <p className="text-sm text-muted-foreground">
                Last backup: {lastBackup}
              </p>
            )}

            <div className="p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground space-y-2">
              <p><strong>Backup includes:</strong> All users, agents, documents metadata, conversations, messages, credits, subscriptions, and embeddings.</p>
              <p className="text-amber-600"><strong>⚠️ Note:</strong> Physical document files in Storage (ahdocuments bucket) must be backed up separately via Supabase Dashboard.</p>
            </div>
          </CardContent>
        </Card>

        {/* Purge Test Data */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Purge Test Data
            </CardTitle>
            <CardDescription>
              Remove all conversations and messages. Keeps users, agents, and documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/30 text-sm">
              <p className="font-medium mb-2">This will delete:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>All conversations (internal and widget)</li>
                <li>All messages</li>
                <li>Usage logs</li>
                <li>n8n chat histories</li>
              </ul>
              <p className="mt-2 text-muted-foreground"><strong>Keeps:</strong> Users, agents, documents, credits, subscriptions</p>
            </div>

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
                  disabled={confirmText !== 'PURGE DATA' || isPurging}
                >
                  {isPurging && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Purge All Test Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Purge all test data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all conversations, messages, and usage logs.
                    Your users, agents, and documents will be preserved.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handlePurgeData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Purge Test Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Full System Reset */}
        <Card className="bg-card border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <RefreshCw className="w-5 h-5" />
              Full System Reset
            </CardTitle>
            <CardDescription>
              Delete ALL data and reset to factory defaults. Your admin account will be preserved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                This action will DELETE EVERYTHING:
              </p>
              <ul className="list-disc list-inside text-sm text-destructive/80 mt-2 space-y-1">
                <li>All users (except your admin account)</li>
                <li>All AI agents and their configurations</li>
                <li>All documents and embeddings</li>
                <li>All conversations and messages</li>
                <li>All credits and transaction history</li>
                <li>All API tokens and settings</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Type "RESET SYSTEM" to confirm</Label>
              <Input
                placeholder="RESET SYSTEM"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
              />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={resetConfirmText !== 'RESET SYSTEM' || isResetting}
                >
                  {isResetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Entire System
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete ALL data in the system.
                    Only your admin account will be preserved.
                    This action CANNOT be undone!
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
