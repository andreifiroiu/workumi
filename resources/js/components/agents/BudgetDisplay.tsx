import { Progress } from '@/components/ui/progress';
import { TrendingUp, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostByCategory {
    category: string;
    cost: number;
}

interface BudgetData {
    dailyCap: number;
    dailySpent: number;
    monthlyCap: number;
    monthlySpent: number;
    costByCategory?: CostByCategory[];
}

interface BudgetDisplayProps {
    budget: BudgetData;
}

function formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
}

function getProgressColor(percentage: number): string {
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 75) return 'bg-amber-600';
    return 'bg-emerald-600';
}

// Map category names to display names
const categoryLabels: Record<string, string> = {
    tasks: 'Tasks',
    work_orders: 'Work Orders',
    client_data: 'Client Data',
    email: 'Email',
    deliverables: 'Deliverables',
    financial: 'Financial',
    playbooks: 'Playbooks',
    general: 'General',
};

export function BudgetDisplay({ budget }: BudgetDisplayProps) {
    const dailyRemaining = budget.dailyCap - budget.dailySpent;
    const monthlyRemaining = budget.monthlyCap - budget.monthlySpent;

    const dailyPercentage = budget.dailyCap > 0
        ? Math.min((budget.dailySpent / budget.dailyCap) * 100, 100)
        : 0;
    const monthlyPercentage = budget.monthlyCap > 0
        ? Math.min((budget.monthlySpent / budget.monthlyCap) * 100, 100)
        : 0;

    // Sort categories by cost (descending)
    const sortedCategories = [...(budget.costByCategory || [])].sort(
        (a, b) => b.cost - a.cost
    );

    // Calculate total for category percentages
    const totalCategoryCost = sortedCategories.reduce((sum, cat) => sum + cat.cost, 0);

    return (
        <div className="space-y-6">
            {/* Daily Budget Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Daily Budget</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Daily Cap</p>
                        <p className="text-xl font-semibold">{formatCurrency(budget.dailyCap)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Spent Today</p>
                        <p className="text-xl font-semibold text-spend-primary">
                            {formatCurrency(budget.dailySpent)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                        <p className={cn(
                            'text-xl font-semibold',
                            dailyRemaining < 0 ? 'text-red-600' : ''
                        )}>
                            {formatCurrency(dailyRemaining)}
                        </p>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Daily Usage</span>
                        <span>{dailyPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress
                        value={dailyPercentage}
                        className="h-2"
                        indicatorClassName={getProgressColor(dailyPercentage)}
                    />
                </div>
            </div>

            {/* Monthly Budget Section */}
            <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Monthly Budget</h4>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Budget Cap</p>
                        <p className="text-xl font-semibold">{formatCurrency(budget.monthlyCap)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Spent</p>
                        <p className="text-xl font-semibold text-spend-primary">
                            {formatCurrency(budget.monthlySpent)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                        <p className={cn(
                            'text-xl font-semibold',
                            monthlyRemaining < 0 ? 'text-red-600' : ''
                        )}>
                            {formatCurrency(monthlyRemaining)}
                        </p>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Monthly Usage</span>
                        <span>{monthlyPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress
                        value={monthlyPercentage}
                        className="h-2"
                        indicatorClassName={getProgressColor(monthlyPercentage)}
                    />
                </div>
            </div>

            {/* Cost Breakdown by Category */}
            {sortedCategories.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium">Cost by Category</h4>
                    </div>
                    <div className="space-y-2">
                        {sortedCategories.map((cat) => {
                            const percentage = totalCategoryCost > 0
                                ? (cat.cost / totalCategoryCost) * 100
                                : 0;

                            return (
                                <div key={cat.category} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {categoryLabels[cat.category] || cat.category}
                                        </span>
                                        <span className="font-medium">
                                            {formatCurrency(cat.cost)}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-600 transition-all"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {totalCategoryCost > 0 && (
                        <div className="flex justify-between pt-2 border-t text-sm">
                            <span className="font-medium">Total</span>
                            <span className="font-semibold">
                                {formatCurrency(totalCategoryCost)}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
