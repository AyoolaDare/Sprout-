import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default function InsightsPage() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Smart Insights</h1>
          <p className="text-muted-foreground">
            Let AI analyze your financial data to find opportunities.
          </p>
        </div>
      </div>
      <Card className="w-full max-w-2xl mx-auto shadow-lg border-destructive/50">
        <CardHeader className="pb-4 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-destructive/10 rounded-full text-destructive">
                <ShieldAlert className="h-10 w-10" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tighter">
              Feature Disabled
            </CardTitle>
            <CardDescription className="text-lg max-w-xl mx-auto text-foreground">
              The financial insights generator is temporarily unavailable.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">You can still view your financial performance in the <a href="/reports" className="text-primary underline">Reports</a> section.</p>
        </CardContent>
      </Card>
    </>
  );
}
