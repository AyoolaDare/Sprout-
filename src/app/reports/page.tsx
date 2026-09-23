
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getReportsData } from '@/lib/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartContainer
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  income: {
    label: 'Income',
    color: 'hsl(var(--chart-1))',
  },
  expenses: {
    label: 'Expenses',
    color: 'hsl(var(--chart-2))',
  },
   profit: {
    label: 'Profit',
    color: 'hsl(var(--chart-4))',
  },
};

interface ReportData {
  pnl: { month: string; income: number; expenses: number; profit: number; }[];
  cashFlow: { name: string; income: number; expenses: number; }[];
}


export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    async function fetchData() {
        if (!user) return;
        setLoading(true);
        const reportData = await getReportsData(user.uid);
        setData(reportData);
        setLoading(false);
    }
    fetchData();
  }, [user]);

  const formatCurrencyForAxis = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `₦${value / 1000}k`;
    }
    return `₦${value}`;
  }

  const formatCurrencyForTooltip = (value: number) => {
     return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value).replace('NGN', '₦');
  }

  const renderLoadingState = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
        </CardHeader>
        <CardContent>
            <div className="relative h-[300px] w-full sm:h-[400px]">
                <Skeleton className="h-full w-full" />
            </div>
        </CardContent>
    </Card>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Analyze your financial performance.
          </p>
        </div>
      </div>

      <Tabs defaultValue="pnl">
        <div className="flex justify-center">
          <TabsList className="grid w-full grid-cols-2 sm:max-w-xs">
            <TabsTrigger value="pnl">Profit &amp; Loss</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="pnl" className="mt-6">
           {loading ? renderLoadingState() : (
              <Card>
                <CardHeader>
                  <CardTitle>Profit &amp; Loss Statement</CardTitle>
                  <CardDescription>
                    Your income, expenses, and net profit over time.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data?.pnl.length === 0 ? (
                     <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground sm:h-[400px]">
                        No profit & loss data to display.
                     </div>
                  ) : (
                    <div className="relative h-[300px] w-full sm:h-[400px]">
                      <ChartContainer config={chartConfig} className="absolute inset-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data?.pnl} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="month"
                              tickLine={false}
                              tickMargin={10}
                              axisLine={false}
                              fontSize={12}
                            />
                            <YAxis
                              tickFormatter={formatCurrencyForAxis}
                              fontSize={12}
                            />
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent formatter={formatCurrencyForTooltip} />}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Bar
                              dataKey="income"
                              fill="var(--color-income)"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="expenses"
                              fill="var(--color-expenses)"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
        </TabsContent>
        <TabsContent value="cashflow" className="mt-6">
           {loading ? renderLoadingState() : (
              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Report</CardTitle>
                  <CardDescription>
                    Monthly cash inflows and outflows.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    {data?.cashFlow.length === 0 ? (
                        <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground sm:h-[400px]">
                            No cash flow data to display.
                        </div>
                    ) : (
                      <div className="relative h-[300px] w-full sm:h-[400px]">
                        <ChartContainer config={chartConfig} className="absolute inset-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data?.cashFlow} accessibilityLayer>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="name"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                fontSize={12}
                              />
                              <YAxis
                                 tickFormatter={formatCurrencyForAxis}
                                 fontSize={12}
                              />
                               <ChartTooltip 
                                  cursor={false} 
                                  content={<ChartTooltipContent formatter={formatCurrencyForTooltip} />}
                               />
                              <ChartLegend content={<ChartLegendContent />} />
                              <Line
                                type="monotone"
                                dataKey="income"
                                stroke="var(--color-income)"
                                strokeWidth={2}
                                dot={true}
                              />
                              <Line
                                type="monotone"
                                dataKey="expenses"
                                stroke="var(--color-expenses)"
                                strokeWidth={2}
                                dot={true}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                  )}
                </CardContent>
              </Card>
           )}
        </TabsContent>
      </Tabs>
    </>
  );
}

    