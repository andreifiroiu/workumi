<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function export(Request $request)
    {
        $team = $request->user()->currentTeam;
        $this->authorize('administer', $team);

        $logs = AuditLog::where('team_id', $team->id)->latest('timestamp')->get();

        // Generate CSV
        $csv = "Timestamp,Actor,Action,Details\n";
        foreach ($logs as $log) {
            $csv .= "\"{$log->timestamp}\",\"{$log->actor_name}\",\"{$log->action}\",\"{$log->details}\"\n";
        }

        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="audit-log.csv"');
    }
}
