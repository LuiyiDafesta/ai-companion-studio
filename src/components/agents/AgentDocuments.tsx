import { useState } from 'react';
import {
    Upload,
    FileText,
    Link as LinkIcon,
    Trash2,
    RefreshCw,
    CheckCircle,
    Clock,
    AlertCircle,
    Loader2,
    Sparkles,
    Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDocuments, useCreateDocument, useDeleteDocument, useRetryDocument } from '@/hooks/useDocuments';
import { useCredits, useConsumeCredits } from '@/hooks/useCredits';
import { useSubscription } from '@/hooks/useSubscription';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DocumentStatus, DocumentType } from '@/types/database';
import { getWebhookUrl } from '@/hooks/useWebhookUrl';

interface AgentDocumentsProps {
    agentId: string;
    agentName: string;
}

const statusConfig: Record<DocumentStatus, { icon: typeof Clock; color: string; bg: string }> = {
    pending: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/30' },
    processing: { icon: Clock, color: 'text-accent-foreground', bg: 'bg-accent/30' },
    indexed: { icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/10' },
    failed: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

export const AgentDocuments = ({ agentId, agentName }: AgentDocumentsProps) => {
    const { data: documents, isLoading, refetch } = useDocuments(agentId);
    const createDocument = useCreateDocument();
    const deleteDocument = useDeleteDocument();
    const retryDocument = useRetryDocument();
    const { t } = useLanguage();
    const { toast } = useToast();
    const [urlInput, setUrlInput] = useState('');
    const [isVectorizing, setIsVectorizing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Hooks para créditos
    const { data: creditsData } = useCredits();
    const consumeCredits = useConsumeCredits();
    const { data: subscription } = useSubscription();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);

        try {
            for (const file of Array.from(files)) {
                // Cálculo de costo: 3 créditos por cada 100KB
                // 100KB = 3, 200KB = 6, 500KB = 15, 1MB = 30
                // Mínimo 3 créditos
                const sizeInMB = file.size / (1024 * 1024);
                const cost = Math.max(3, Math.ceil(sizeInMB * 10) * 3);

                if ((creditsData?.balance || 0) < cost) {
                    toast({
                        title: 'Saldo insuficiente',
                        description: `Necesitas ${cost} créditos para subir este archivo (${(sizeInMB).toFixed(2)} MB). Tienes ${creditsData?.balance || 0}.`,
                        variant: 'destructive',
                    });
                    continue; // Skip this file
                }

                // Generar path único: agentId/timestamp_filename
                const timestamp = Date.now();
                const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const filePath = `${agentId}/${timestamp}_${sanitizedName}`;

                // Primero intentar deducir créditos (optimistic check done, now execute)
                // O mejor: deducir APUES de subir exitosamente para no cobrar por fallos.
                // Pero verificar saldo ANTES (ya hecho arriba).

                // Subir archivo a Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('ahdocuments')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('Error uploading file:', uploadError);
                    toast({
                        title: 'Error al subir archivo',
                        description: uploadError.message,
                        variant: 'destructive',
                    });
                    continue;
                }

                // Consumir créditos tras éxito
                try {
                    await consumeCredits.mutateAsync({
                        amount: cost,
                        type: 'document_upload',
                        description: `Subida de documento: ${file.name} (${(sizeInMB).toFixed(2)} MB)`
                    });
                } catch (creditError) {
                    console.error('Error consumiendo créditos pero archivo subido:', creditError);
                    // Podríamos borrar el archivo si falla el cobro, pero es edge case.
                    // Dejamos pasar por ahora o notificar admin.
                }

                // Obtener URL pública del archivo
                const { data: urlData } = supabase.storage
                    .from('ahdocuments')
                    .getPublicUrl(filePath);


                const publicUrl = urlData?.publicUrl;

                // Determinar tipo de documento
                const type: DocumentType = file.name.endsWith('.pdf') ? 'pdf' : 'text';

                // Crear registro en la base de datos con la URL del archivo
                createDocument.mutate({
                    name: file.name,
                    type,
                    file_size: file.size,
                    file_path: filePath,
                    url: publicUrl,  // Guardamos la URL pública para que n8n pueda descargar
                    agent_id: agentId,
                });

                console.log('✅ Archivo subido:', { filePath, publicUrl });
            }

            toast({
                title: 'Archivos subidos',
                description: `Se subieron ${files.length} archivo(s) correctamente.`,
            });
        } catch (error) {
            console.error('Error in file upload:', error);
            toast({
                title: 'Error al subir archivos',
                description: error instanceof Error ? error.message : 'Error desconocido',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleUrlAdd = () => {
        if (!urlInput.trim()) return;

        createDocument.mutate({
            name: urlInput,
            type: 'url',
            url: urlInput,
            agent_id: agentId,
        });
        setUrlInput('');
    };

    const handleDelete = async (id: string, filePath?: string | null) => {
        // Primero llamar webhook de n8n para eliminar embeddings
        const deleteWebhookUrl = await getWebhookUrl('VITE_N8N_DELETE_EMBEDDINGS_WEBHOOK_URL');
        if (deleteWebhookUrl) {
            try {
                const response = await fetch(deleteWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        documentId: id,
                        agentId,
                        tableName: `embeddings_${agentId.split('-').join('_')}`,
                    }),
                });

                const data = await response.json();
                const success = data[0]?.success || data.success;

                if (!success) {
                    toast({
                        title: 'Error al eliminar embeddings',
                        description: 'No se pudieron eliminar los embeddings del documento.',
                        variant: 'destructive',
                    });
                    return; // No continuar si falló
                }

                console.log(`✅ Embeddings eliminados correctamente`);
            } catch (err) {
                console.error('Error llamando webhook de eliminación:', err);
                toast({
                    title: 'Error de conexión',
                    description: 'No se pudo conectar con el servidor de embeddings.',
                    variant: 'destructive',
                });
                return; // No continuar si falló
            }
        }

        // Si hay un archivo en storage, eliminarlo
        if (filePath) {
            const { error } = await supabase.storage
                .from('ahdocuments')
                .remove([filePath]);

            if (error) {
                console.error('Error deleting file from storage:', error);
            }
        }

        // Finalmente eliminar el documento de la base de datos
        deleteDocument.mutate(id);
    };

    const handleRetry = (id: string) => {
        retryDocument.mutate(id);
    };

    const handleVectorize = async () => {
        const webhookUrl = await getWebhookUrl('VITE_N8N_VECTORIZE_WEBHOOK_URL');

        if (!webhookUrl) {
            toast({
                title: 'Error de Configuración',
                description: 'VITE_N8N_VECTORIZE_WEBHOOK_URL no está configurada.',
                variant: 'destructive',
            });
            return;
        }

        const pendingDocs = documents?.filter(d => d.status === 'pending' || d.status === 'failed') || [];

        if (pendingDocs.length === 0) {
            toast({
                title: 'Sin documentos pendientes',
                description: 'Todos los documentos ya están vectorizados.',
            });
            return;
        }

        setIsVectorizing(true);

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId,
                    agentName,
                    // Convertir agentId a formato de tabla (guiones bajos)
                    tableName: `embeddings_${agentId.split('-').join('_')}`,
                    documents: pendingDocs.map(doc => ({
                        id: doc.id,
                        name: doc.name,
                        type: doc.type,
                        url: doc.url,  // URL pública para descargar el archivo
                        file_path: doc.file_path,
                    })),
                    timestamp: new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            // Procesar respuesta del webhook
            const data = await response.json();
            console.log('Respuesta de vectorización:', data);

            // Verificar si hay resultados exitosos - manejar diferentes formatos de respuesta
            const results = data[0]?.results || data.results || data || [];
            const successCount = Array.isArray(results)
                ? results.filter((r: { success: boolean }) => r.success).length
                : (results.success ? 1 : 0);

            console.log('Results procesados:', results, 'Success count:', successCount);

            if (successCount > 0) {
                // Actualizar estado de documentos a 'indexed' en Supabase
                const docIds = pendingDocs.map(d => d.id);
                console.log('Actualizando documentos con IDs:', docIds);

                const { data: updateData, error: updateError } = await supabase
                    .from('ah_documents')
                    .update({ status: 'indexed' })
                    .in('id', docIds)
                    .select();

                console.log('Resultado update:', updateData, 'Error:', updateError);

                if (updateError) {
                    console.error('Error actualizando estado:', updateError);
                    toast({
                        title: 'Error al actualizar estado',
                        description: updateError.message,
                        variant: 'destructive',
                    });
                } else {
                    toast({
                        title: '¡Vectorización completada!',
                        description: `${successCount} documento(s) indexados correctamente.`,
                    });
                }
            } else {
                toast({
                    title: 'Vectorización finalizada',
                    description: 'Revisa el estado de los documentos.',
                    variant: 'destructive',
                });
            }

            // Refrescar la lista
            refetch();
        } catch (error) {
            console.error('Error vectorizing:', error);
            toast({
                title: 'Error al vectorizar',
                description: error instanceof Error ? error.message : 'No se pudo conectar con n8n',
                variant: 'destructive',
            });
        } finally {
            setIsVectorizing(false);
        }
    };

    const formatFileSize = (bytes: number | null | undefined) => {
        if (!bytes) return null;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getStatusLabel = (status: DocumentStatus) => {
        const labels: Record<DocumentStatus, string> = {
            pending: t('documents.pending'),
            processing: t('documents.processing'),
            indexed: t('documents.indexed'),
            failed: t('documents.failed'),
        };
        return labels[status];
    };

    const pendingCount = documents?.filter(d => d.status === 'pending' || d.status === 'failed').length || 0;
    const indexedCount = documents?.filter(d => d.status === 'indexed').length || 0;

    return (
        <div className="space-y-6">
            {/* Upload Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t('documents.uploadFile')}</CardTitle>
                        <CardDescription className="text-sm">
                            PDFs y archivos de texto
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <label
                            htmlFor={`file-upload-${agentId}`}
                            className={cn(
                                "flex flex-col items-center justify-center h-24",
                                "border-2 border-dashed rounded-lg cursor-pointer",
                                "transition-colors hover:border-primary/50 hover:bg-muted/30",
                                isUploading && "opacity-50 pointer-events-none"
                            )}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-6 h-6 text-muted-foreground mb-1 animate-spin" />
                                    <span className="text-sm text-muted-foreground">Subiendo...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                                    <span className="text-sm text-muted-foreground">Click para subir</span>
                                </>
                            )}
                            <input
                                id={`file-upload-${agentId}`}
                                type="file"
                                className="hidden"
                                onChange={handleFileUpload}
                                accept=".pdf,.txt,.md,.doc,.docx"
                                multiple
                                disabled={isUploading}
                            />
                        </label>
                    </CardContent>
                </Card>

                <Card className="bg-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t('documents.addUrl')}</CardTitle>
                        <CardDescription className="text-sm">
                            Páginas web para indexar
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://ejemplo.com/pagina"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUrlAdd()}
                            />
                            <Button onClick={handleUrlAdd} disabled={!urlInput.trim()}>
                                <LinkIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Vectorize Button */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-muted-foreground" />
                    <div>
                        <p className="font-medium">Base Vectorial</p>
                        <p className="text-sm text-muted-foreground">
                            {indexedCount} indexados • {pendingCount} pendientes
                        </p>
                    </div>
                </div>
                <Button
                    onClick={handleVectorize}
                    disabled={isVectorizing || pendingCount === 0}
                    variant={pendingCount > 0 ? "default" : "outline"}
                >
                    {isVectorizing ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Vectorizando...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Vectorizar ({pendingCount})
                        </>
                    )}
                </Button>
            </div>

            {/* Documents List */}
            <div className="space-y-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : documents && documents.length > 0 ? (
                    documents.map((doc) => {
                        const StatusIcon = statusConfig[doc.status].icon;
                        return (
                            <div
                                key={doc.id}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border",
                                    statusConfig[doc.status].bg
                                )}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {doc.type === 'url' ? (
                                        <LinkIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                    ) : (
                                        <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate text-sm">{doc.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="outline" className="text-xs">
                                                {doc.type.toUpperCase()}
                                            </Badge>
                                            {doc.file_size && (
                                                <span>{formatFileSize(doc.file_size)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={cn("text-xs", statusConfig[doc.status].color)}
                                    >
                                        <StatusIcon className="w-3 h-3 mr-1" />
                                        {getStatusLabel(doc.status)}
                                    </Badge>
                                    {doc.status === 'failed' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRetry(doc.id)}
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(doc.id, doc.file_path)}
                                    >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No hay documentos para este agente</p>
                        <p className="text-sm">Sube archivos o agrega URLs para comenzar</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentDocuments;
