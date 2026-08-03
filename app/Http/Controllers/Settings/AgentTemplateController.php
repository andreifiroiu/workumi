<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgentTemplateResource;
use App\Models\AgentTemplate;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgentTemplateController extends Controller
{
    /**
     * List available agent templates.
     */
    public function index(Request $request): Response
    {
        $this->authorize('administer', $request->user()->currentTeam);

        $templates = AgentTemplate::query()
            ->active()
            ->withCount('agents')
            ->orderBy('name')
            ->get();

        return Inertia::render('settings/agent-templates/index', [
            'templates' => AgentTemplateResource::collection($templates)->resolve(),
        ]);
    }

    /**
     * Show a single template with its details.
     */
    public function show(Request $request, AgentTemplate $template): Response
    {
        $this->authorize('administer', $request->user()->currentTeam);

        $template->loadCount('agents');

        return Inertia::render('settings/agent-templates/show', [
            'template' => (new AgentTemplateResource($template))->resolve(),
        ]);
    }
}
