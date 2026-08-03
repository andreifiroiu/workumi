<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AvailableIntegration;
use App\Models\TeamIntegration;
use Illuminate\Http\Request;

class IntegrationsController extends Controller
{
    public function connect(Request $request, $integrationId)
    {
        $team = $request->user()->currentTeam;
        $this->authorize('administer', $team);

        $integration = AvailableIntegration::findOrFail($integrationId);

        $teamIntegration = TeamIntegration::forTeam($team, $integration);

        // Placeholder: In production, this would redirect to OAuth flow
        $teamIntegration->update([
            'connected' => true,
            'connected_at' => now(),
            'connected_by' => $request->user()->id,
            'sync_status' => 'success',
        ]);

        return back()->with('success', "{$integration->name} connected successfully.");
    }

    public function disconnect(Request $request, $integrationId)
    {
        $team = $request->user()->currentTeam;
        $this->authorize('administer', $team);

        $integration = AvailableIntegration::findOrFail($integrationId);

        $teamIntegration = TeamIntegration::where('team_id', $team->id)
            ->where('available_integration_id', $integration->id)
            ->first();

        if ($teamIntegration) {
            $teamIntegration->update([
                'connected' => false,
                'connected_at' => null,
                'connected_by' => null,
                'config' => null,
                'last_sync_at' => null,
                'sync_status' => null,
                'error_message' => null,
            ]);
        }

        return back()->with('success', "{$integration->name} disconnected successfully.");
    }
}
