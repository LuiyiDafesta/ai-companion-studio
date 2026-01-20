import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { Copy, Check, Code, } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import ChatWidget from '@/components/widget/ChatWidget';

export default function EmbedPage() {
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();
    const [copiedIframe, setCopiedIframe] = useState(false);
    const [copiedScript, setCopiedScript] = useState(false);

    if (!id) return null;

    const baseUrl = window.location.origin;
    const basePath = import.meta.env.PROD ? '/agentes' : '';
    const widgetUrl = `${baseUrl}${basePath}/widget/${id}`;

    const iframeCode = `<iframe 
  src="${widgetUrl}"
  width="400" 
  height="600"
  frameborder="0"
  style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
></iframe>`;

    const scriptCode = `<!-- Chat Widget Script -->
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${widgetUrl}';
    iframe.style.cssText = 'position:fixed;bottom:20px;right:20px;width:400px;height:600px;border:none;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:9999;';
    document.body.appendChild(iframe);
  })();
</script>`;

    const wordpressCode = `[agenthub id="${id}"]`;

    const copyToClipboard = async (text: string, type: 'iframe' | 'script') => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === 'iframe') {
                setCopiedIframe(true);
                setTimeout(() => setCopiedIframe(false), 2000);
            } else {
                setCopiedScript(true);
                setTimeout(() => setCopiedScript(false), 2000);
            }
            toast({
                title: '¡Copiado!',
                description: 'El código ha sido copiado al portapapeles'
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'No se pudo copiar el código',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Incrustar Widget de Chat</h1>
                <p className="text-muted-foreground">
                    Elige el método de integración y copia el código en tu sitio web
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Code Generator */}
                <div className="space-y-6">
                    <Tabs defaultValue="iframe" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="iframe">
                                <Code className="w-4 h-4 mr-2" />
                                iframe (Recomendado)
                            </TabsTrigger>
                            <TabsTrigger value="script">
                                <Code className="w-4 h-4 mr-2" />
                                Script
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="iframe" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Código iframe</CardTitle>
                                    <CardDescription>
                                        Método más simple y seguro. Compatible con WordPress, Wix, Shopify y cualquier sitio web.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                            <code>{iframeCode}</code>
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="absolute top-2 right-2"
                                            onClick={() => copyToClipboard(iframeCode, 'iframe')}
                                        >
                                            {copiedIframe ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <h4 className="font-medium">Pros:</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                                            <li>No conflictos con estilos CSS del sitio</li>
                                            <li>Instalación simple y rápida</li>
                                            <li>Funciona en cualquier plataforma</li>
                                            <li>Seguridad mejorada</li>
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="script" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Código JavaScript</CardTitle>
                                    <CardDescription>
                                        Más flexible y personalizable. Ideal para desarrolladores.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                            <code>{scriptCode}</code>
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="absolute top-2 right-2"
                                            onClick={() => copyToClipboard(scriptCode, 'script')}
                                        >
                                            {copiedScript ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <h4 className="font-medium">Pros:</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                                            <li>Mayor control visual</li>
                                            <li>Puede heredar estilos del sitio</li>
                                            <li>Eventos JavaScript personalizables</li>
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* WordPress Shortcode */}
                    <Card>
                        <CardHeader>
                            <CardTitle>WordPress (Próximamente)</CardTitle>
                            <CardDescription>
                                Plugin dedicado para WordPress
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-muted p-4 rounded-lg text-sm opacity-50">
                                <code>{wordpressCode}</code>
                            </pre>
                            <p className="text-sm text-muted-foreground mt-2">
                                El plugin de WordPress estará disponible pronto. Por ahora, usa el código iframe.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Instructions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Instrucciones</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-medium mb-2">1. Copiar el código</h4>
                                <p className="text-sm text-muted-foreground">
                                    Haz clic en el botón de copiar del método que prefieras
                                </p>
                            </div>
                            <div>
                                <h4 className="font-medium mb-2">2. Pegar en tu sitio</h4>
                                <p className="text-sm text-muted-foreground">
                                    Pega el código antes de la etiqueta <code className="bg-muted px-1">&lt;/body&gt;</code> en tu HTML
                                </p>
                            </div>
                            <div>
                                <h4 className="font-medium mb-2">3. ¡Listo!</h4>
                                <p className="text-sm text-muted-foreground">
                                    El widget aparecerá en la esquina inferior derecha de tu sitio
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Live Preview */}
                <div>
                    <Card className="sticky top-4">
                        <CardHeader>
                            <CardTitle>Vista Previa en Vivo</CardTitle>
                            <CardDescription>
                                Así se verá el widget en tu sitio web
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted rounded-lg p-4" style={{ height: '600px' }}>
                                <ChatWidget agentId={id} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
