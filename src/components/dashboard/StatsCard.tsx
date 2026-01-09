import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const StatsCard = ({ title, value, icon, trend, className }: StatsCardProps) => {
  return (
    <Card className={cn("bg-card", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-semibold text-foreground mt-1">{value}</p>
            {trend && (
              <p className={cn(
                "text-sm mt-2 flex items-center gap-1",
                trend.isPositive ? "text-primary" : "text-destructive"
              )}>
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                {Math.abs(trend.value)}% from last month
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
