import { useParams } from 'react-router-dom';
import ChatWidget from '@/components/widget/ChatWidget';

/**
 * Public widget page (embedded in iframes)
 * No authentication required
 */
export default function WidgetPage() {
    const { agentId } = useParams<{ agentId: string }>();

    if (!agentId) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Invalid agent ID</p>
            </div>
        );
    }

    return (
        <div className="h-screen">
            <ChatWidget agentId={agentId} />
        </div>
    );
}
