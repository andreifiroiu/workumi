<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Party;
use App\Models\Project;
use App\Models\TimeEntry;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProfitabilityReportsController extends Controller
{
    /**
     * Display the profitability reports page with initial data.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        if (! $team) {
            return redirect()->route('account.teams.index');
        }

        $filters = [
            'date_from' => $request->input('date_from', now()->startOfMonth()->toDateString()),
            'date_to' => $request->input('date_to', now()->endOfMonth()->toDateString()),
        ];

        $byProjectData = $this->getByProjectData($team->id, $user->id, $filters);

        return Inertia::render('reports/profitability/index', [
            'byProjectData' => $byProjectData,
            'filters' => $filters,
        ]);
    }

    /**
     * Get profitability data grouped by project.
     */
    public function byProject(Request $request): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $filters = [
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ];

        $data = $this->getByProjectData($team->id, $user->id, $filters);

        return response()->json(['data' => $data]);
    }

    /**
     * Get profitability data grouped by work order.
     */
    public function byWorkOrder(Request $request): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $filters = [
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ];

        $data = $this->getByWorkOrderData($team->id, $user->id, $filters);

        return response()->json(['data' => $data]);
    }

    /**
     * Get profitability data grouped by team member.
     */
    public function byTeamMember(Request $request): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $filters = [
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ];

        $data = $this->getByTeamMemberData($team->id, $filters);

        return response()->json(['data' => $data]);
    }

    /**
     * Get profitability data grouped by client (Party).
     */
    public function byClient(Request $request): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        $filters = [
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ];

        $data = $this->getByClientData($team->id, $filters);

        return response()->json(['data' => $data]);
    }

    /**
     * Get profitability data by project.
     *
     * @return array<int, array<string, mixed>>
     */
    private function getByProjectData(int $teamId, int $userId, array $filters): array
    {
        $projects = Project::query()
            ->forTeam($teamId)
            ->visibleTo($userId)
            ->select('id', 'name', 'budget_cost', 'actual_cost', 'actual_revenue')
            ->get();

        return $projects->map(function ($project) use ($filters) {
            $timeEntryData = $this->getProjectTimeEntryMetrics($project->id, $filters);

            // Use filtered time entry data if date filters are applied, otherwise use stored values
            $actualCost = ! empty($filters['date_from']) || ! empty($filters['date_to'])
                ? $timeEntryData['total_cost']
                : (float) ($project->actual_cost ?? 0);

            $revenue = ! empty($filters['date_from']) || ! empty($filters['date_to'])
                ? $timeEntryData['total_revenue']
                : (float) ($project->actual_revenue ?? 0);

            $totalHours = $timeEntryData['total_hours'];
            $billableHours = $timeEntryData['billable_hours'];

            return [
                'id' => $project->id,
                'name' => $project->name,
                'budget_cost' => (float) ($project->budget_cost ?? 0),
                'actual_cost' => $actualCost,
                'revenue' => $revenue,
                'margin' => $this->calculateMargin($revenue, $actualCost),
                'margin_percent' => $this->calculateMarginPercent($revenue, $actualCost),
                'utilization' => $this->calculateUtilization($billableHours, $totalHours),
                'total_hours' => $totalHours,
                'billable_hours' => $billableHours,
                'billable_cost' => $timeEntryData['billable_cost'],
                'non_billable_cost' => $timeEntryData['non_billable_cost'],
            ];
        })->values()->toArray();
    }

    /**
     * Get profitability data by work order.
     *
     * @return array<int, array<string, mixed>>
     */
    private function getByWorkOrderData(int $teamId, int $userId, array $filters): array
    {
        $workOrders = WorkOrder::query()
            ->forTeam($teamId)
            ->visibleTo($userId)
            ->with('project:id,name')
            ->select('id', 'project_id', 'title', 'budget_cost', 'actual_cost', 'actual_revenue')
            ->get();

        return $workOrders->map(function ($workOrder) use ($filters) {
            $timeEntryData = $this->getWorkOrderTimeEntryMetrics($workOrder->id, $filters);

            // Use filtered time entry data if date filters are applied, otherwise use stored values
            $actualCost = ! empty($filters['date_from']) || ! empty($filters['date_to'])
                ? $timeEntryData['total_cost']
                : (float) ($workOrder->actual_cost ?? 0);

            $revenue = ! empty($filters['date_from']) || ! empty($filters['date_to'])
                ? $timeEntryData['total_revenue']
                : (float) ($workOrder->actual_revenue ?? 0);

            $totalHours = $timeEntryData['total_hours'];
            $billableHours = $timeEntryData['billable_hours'];

            return [
                'id' => $workOrder->id,
                'name' => $workOrder->title,
                'project_id' => $workOrder->project_id,
                'project_name' => $workOrder->project?->name,
                'budget_cost' => (float) ($workOrder->budget_cost ?? 0),
                'actual_cost' => $actualCost,
                'revenue' => $revenue,
                'margin' => $this->calculateMargin($revenue, $actualCost),
                'margin_percent' => $this->calculateMarginPercent($revenue, $actualCost),
                'utilization' => $this->calculateUtilization($billableHours, $totalHours),
                'total_hours' => $totalHours,
                'billable_hours' => $billableHours,
                'billable_cost' => $timeEntryData['billable_cost'],
                'non_billable_cost' => $timeEntryData['non_billable_cost'],
            ];
        })->values()->toArray();
    }

    /**
     * Get profitability data by team member.
     *
     * @return array<int, array<string, mixed>>
     */
    private function getByTeamMemberData(int $teamId, array $filters): array
    {
        $query = TimeEntry::query()
            ->forTeam($teamId)
            ->join('users', 'time_entries.user_id', '=', 'users.id')
            ->select(
                'users.id as user_id',
                'users.name as user_name',
                DB::raw('SUM(time_entries.hours) as total_hours'),
                DB::raw('SUM(CASE WHEN time_entries.is_billable = 1 THEN time_entries.hours ELSE 0 END) as billable_hours'),
                DB::raw('SUM(time_entries.calculated_cost) as total_cost'),
                DB::raw('SUM(time_entries.calculated_revenue) as total_revenue')
            )
            ->groupBy('users.id', 'users.name');

        if (! empty($filters['date_from'])) {
            $query->whereDate('time_entries.date', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('time_entries.date', '<=', $filters['date_to']);
        }

        $entries = $query->get();

        return $entries->map(function ($entry) {
            $totalHours = (float) $entry->total_hours;
            $billableHours = (float) $entry->billable_hours;
            $cost = (float) $entry->total_cost;
            $revenue = (float) $entry->total_revenue;

            return [
                'user_id' => $entry->user_id,
                'user_name' => $entry->user_name,
                'total_hours' => $totalHours,
                'billable_hours' => $billableHours,
                'cost' => $cost,
                'revenue' => $revenue,
                'margin' => $this->calculateMargin($revenue, $cost),
                'utilization' => $this->calculateUtilization($billableHours, $totalHours),
            ];
        })->values()->toArray();
    }

    /**
     * Get profitability data by client (Party).
     *
     * @return array<int, array<string, mixed>>
     */
    private function getByClientData(int $teamId, array $filters): array
    {
        $parties = Party::query()
            ->forTeam($teamId)
            ->with(['projects' => function ($query) {
                $query->select('id', 'party_id', 'name', 'budget_cost', 'actual_cost', 'actual_revenue');
            }])
            ->select('id', 'name', 'team_id')
            ->get();

        return $parties->map(function ($party) use ($filters) {
            $totalBudgetCost = 0.0;
            $totalActualCost = 0.0;
            $totalRevenue = 0.0;
            $totalHours = 0.0;
            $billableHours = 0.0;

            foreach ($party->projects as $project) {
                $totalBudgetCost += (float) ($project->budget_cost ?? 0);

                if (! empty($filters['date_from']) || ! empty($filters['date_to'])) {
                    // Use filtered time entry data
                    $timeEntryData = $this->getProjectTimeEntryMetrics($project->id, $filters);
                    $totalActualCost += $timeEntryData['total_cost'];
                    $totalRevenue += $timeEntryData['total_revenue'];
                    $totalHours += $timeEntryData['total_hours'];
                    $billableHours += $timeEntryData['billable_hours'];
                } else {
                    // Use stored values
                    $totalActualCost += (float) ($project->actual_cost ?? 0);
                    $totalRevenue += (float) ($project->actual_revenue ?? 0);
                }
            }

            return [
                'client_id' => $party->id,
                'client_name' => $party->name,
                'project_count' => $party->projects->count(),
                'total_budget_cost' => $totalBudgetCost,
                'total_actual_cost' => $totalActualCost,
                'total_revenue' => $totalRevenue,
                'total_margin' => $this->calculateMargin($totalRevenue, $totalActualCost),
                'margin_percent' => $this->calculateMarginPercent($totalRevenue, $totalActualCost),
                'utilization' => $this->calculateUtilization($billableHours, $totalHours),
            ];
        })->filter(fn ($client) => $client['project_count'] > 0)
            ->values()
            ->toArray();
    }

    /**
     * Get time entry metrics for a project, optionally filtered by date range.
     *
     * @return array<string, float>
     */
    private function getProjectTimeEntryMetrics(int $projectId, array $filters): array
    {
        $query = TimeEntry::query()
            ->join('tasks', 'time_entries.task_id', '=', 'tasks.id')
            ->join('work_orders', 'tasks.work_order_id', '=', 'work_orders.id')
            ->where('work_orders.project_id', $projectId);

        if (! empty($filters['date_from'])) {
            $query->whereDate('time_entries.date', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('time_entries.date', '<=', $filters['date_to']);
        }

        $result = $query->selectRaw('
            SUM(time_entries.hours) as total_hours,
            SUM(CASE WHEN time_entries.is_billable = 1 THEN time_entries.hours ELSE 0 END) as billable_hours,
            SUM(time_entries.calculated_cost) as total_cost,
            SUM(time_entries.calculated_revenue) as total_revenue,
            SUM(CASE WHEN time_entries.is_billable = 1 THEN time_entries.calculated_cost ELSE 0 END) as billable_cost,
            SUM(CASE WHEN time_entries.is_billable = 0 THEN time_entries.calculated_cost ELSE 0 END) as non_billable_cost
        ')->first();

        return [
            'total_hours' => (float) ($result->total_hours ?? 0),
            'billable_hours' => (float) ($result->billable_hours ?? 0),
            'total_cost' => (float) ($result->total_cost ?? 0),
            'total_revenue' => (float) ($result->total_revenue ?? 0),
            'billable_cost' => (float) ($result->billable_cost ?? 0),
            'non_billable_cost' => (float) ($result->non_billable_cost ?? 0),
        ];
    }

    /**
     * Get time entry metrics for a work order, optionally filtered by date range.
     *
     * @return array<string, float>
     */
    private function getWorkOrderTimeEntryMetrics(int $workOrderId, array $filters): array
    {
        $query = TimeEntry::query()
            ->join('tasks', 'time_entries.task_id', '=', 'tasks.id')
            ->where('tasks.work_order_id', $workOrderId);

        if (! empty($filters['date_from'])) {
            $query->whereDate('time_entries.date', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('time_entries.date', '<=', $filters['date_to']);
        }

        $result = $query->selectRaw('
            SUM(time_entries.hours) as total_hours,
            SUM(CASE WHEN time_entries.is_billable = 1 THEN time_entries.hours ELSE 0 END) as billable_hours,
            SUM(time_entries.calculated_cost) as total_cost,
            SUM(time_entries.calculated_revenue) as total_revenue,
            SUM(CASE WHEN time_entries.is_billable = 1 THEN time_entries.calculated_cost ELSE 0 END) as billable_cost,
            SUM(CASE WHEN time_entries.is_billable = 0 THEN time_entries.calculated_cost ELSE 0 END) as non_billable_cost
        ')->first();

        return [
            'total_hours' => (float) ($result->total_hours ?? 0),
            'billable_hours' => (float) ($result->billable_hours ?? 0),
            'total_cost' => (float) ($result->total_cost ?? 0),
            'total_revenue' => (float) ($result->total_revenue ?? 0),
            'billable_cost' => (float) ($result->billable_cost ?? 0),
            'non_billable_cost' => (float) ($result->non_billable_cost ?? 0),
        ];
    }

    /**
     * Calculate margin (revenue - cost).
     */
    private function calculateMargin(float $revenue, float $cost): float
    {
        return round($revenue - $cost, 2);
    }

    /**
     * Calculate margin percentage.
     * Handle division by zero by returning 0 when revenue is 0.
     */
    private function calculateMarginPercent(float $revenue, float $cost): float
    {
        if ($revenue <= 0) {
            return 0.0;
        }

        $margin = $revenue - $cost;

        return round(($margin / $revenue) * 100, 2);
    }

    /**
     * Calculate utilization percentage.
     * Handle division by zero by returning 0 when total hours is 0.
     */
    private function calculateUtilization(float $billableHours, float $totalHours): float
    {
        if ($totalHours <= 0) {
            return 0.0;
        }

        return round(($billableHours / $totalHours) * 100, 2);
    }
}
