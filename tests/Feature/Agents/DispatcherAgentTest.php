<?php

declare(strict_types=1);

use App\Agents\BaseAgent;
use App\Agents\DispatcherAgent;
use App\Agents\Tools\CreateDraftWorkOrderTool;
use App\Agents\Tools\GetPlaybooksTool;
use App\Agents\Tools\GetTeamCapacityTool;
use App\Agents\Tools\GetTeamSkillsTool;
use App\Agents\Workflows\BaseAgentWorkflow;
use App\Agents\Workflows\DispatcherWorkflow;
use App\Contracts\Tools\ToolInterface;
use App\Enums\AgentType;
use App\Models\AgentConfiguration;
use App\Models\AIAgent;
use App\Models\GlobalAISettings;
use App\Models\Party;
use App\Models\Project;
use App\Models\User;
use App\Models\UserSkill;
use App\Services\AgentApprovalService;
use App\Services\AgentBudgetService;
use App\Services\AgentOrchestrator;
use App\Services\ToolGateway;
use App\Services\ToolRegistry;

beforeEach(function () {
    $this->user = User::factory()->create([
        'capacity_hours_per_week' => 40,
        'current_workload_hours' => 20,
    ]);
    $this->team = $this->user->createTeam(['name' => 'Test Team']);
    $this->user->current_team_id = $this->team->id;
    $this->user->save();

    $this->party = Party::factory()->create(['team_id' => $this->team->id]);
    $this->project = Project::factory()->create([
        'team_id' => $this->team->id,
        'party_id' => $this->party->id,
        'owner_id' => $this->user->id,
        'name' => 'Test Project',
    ]);

    $this->agent = AIAgent::factory()->create([
        'code' => 'dispatcher-agent',
        'name' => 'Dispatcher Agent',
        'type' => AgentType::WorkRouting,
        'description' => 'Routes work to team members based on skills and capacity',
        'tools' => ['work_routing', 'skill_matching', 'capacity_analysis'],
    ]);

    $this->config = AgentConfiguration::create([
        'team_id' => $this->team->id,
        'ai_agent_id' => $this->agent->id,
        'enabled' => true,
        'daily_run_limit' => 50,
        'monthly_budget_cap' => 100.00,
        'current_month_spend' => 0.00,
        'daily_spend' => 0.00,
        'can_create_work_orders' => true,
        'can_modify_tasks' => true,
        'can_access_client_data' => true,
        'can_send_emails' => false,
        'can_modify_deliverables' => true,
        'can_access_financial_data' => false,
        'can_modify_playbooks' => true,
    ]);

    $this->globalSettings = GlobalAISettings::create([
        'team_id' => $this->team->id,
        'total_monthly_budget' => 1000.00,
        'current_month_spend' => 0.00,
        'require_approval_external_sends' => true,
        'require_approval_financial' => true,
        'require_approval_contracts' => true,
        'require_approval_scope_changes' => false,
    ]);

    $this->registry = new ToolRegistry;
    $this->budgetService = new AgentBudgetService;
    $this->gateway = new ToolGateway($this->registry);
});

test('DispatcherAgent extends BaseAgent and returns dispatcher-specific instructions', function () {
    $dispatcherAgent = new DispatcherAgent(
        $this->agent,
        $this->config,
        $this->gateway,
        $this->budgetService
    );

    expect($dispatcherAgent)->toBeInstanceOf(BaseAgent::class);

    $instructions = $dispatcherAgent->instructions();
    expect($instructions)->toBeString();
    expect($instructions)->toContain('Dispatcher');
});

test('DispatcherAgent returns dispatcher-specific tools', function () {
    // Register the dispatcher tools first
    $this->registry->register(new GetTeamSkillsTool);
    $this->registry->register(new GetTeamCapacityTool);
    $this->registry->register(new CreateDraftWorkOrderTool);
    $this->registry->register(new GetPlaybooksTool);

    $dispatcherAgent = new DispatcherAgent(
        $this->agent,
        $this->config,
        $this->gateway,
        $this->budgetService
    );

    $tools = $dispatcherAgent->getLaboTools();
    expect($tools)->toBeArray();

    // The dispatcher is an analyzer with READ-ONLY tools only. Entity creation
    // is performed by the caller, so write tools must not be exposed here.
    $toolNames = array_map(fn ($tool) => $tool->name(), $tools);
    expect($toolNames)->toContain('get-team-skills');
    expect($toolNames)->toContain('get-team-capacity');
    expect($toolNames)->toContain('get-playbooks');
    expect($toolNames)->not->toContain('create-draft-work-order');
});

test('DispatcherWorkflow extends BaseAgentWorkflow with correct identifier', function () {
    $orchestrator = app(AgentOrchestrator::class);
    $approvalService = app(AgentApprovalService::class);

    $workflow = new DispatcherWorkflow($orchestrator, $approvalService);

    expect($workflow)->toBeInstanceOf(BaseAgentWorkflow::class);
    expect($workflow->getIdentifier())->toBe('dispatcher-workflow');
    expect($workflow->getDescription())->toContain('routes');
});

test('Dispatcher tools implement ToolInterface correctly', function () {
    $tools = [
        new GetTeamSkillsTool,
        new GetTeamCapacityTool,
        new CreateDraftWorkOrderTool,
        new GetPlaybooksTool,
    ];

    foreach ($tools as $tool) {
        expect($tool)->toBeInstanceOf(ToolInterface::class);
        expect($tool->name())->toBeString();
        expect($tool->description())->toBeString();
        expect($tool->category())->toBeString();
        expect($tool->getParameters())->toBeArray();
    }
});

test('GetTeamSkillsTool returns team member skills with proficiency', function () {
    // Create additional team members with skills
    $member1 = User::factory()->create([
        'capacity_hours_per_week' => 40,
        'current_workload_hours' => 10,
    ]);
    $member2 = User::factory()->create([
        'capacity_hours_per_week' => 32,
        'current_workload_hours' => 24,
    ]);

    $this->team->addUser($member1, 'member');
    $this->team->addUser($member2, 'member');

    // Create skills for team members
    UserSkill::create([
        'user_id' => $member1->id,
        'skill_name' => 'Laravel',
        'proficiency' => 3, // Advanced
    ]);
    UserSkill::create([
        'user_id' => $member1->id,
        'skill_name' => 'React',
        'proficiency' => 2, // Intermediate
    ]);
    UserSkill::create([
        'user_id' => $member2->id,
        'skill_name' => 'Laravel',
        'proficiency' => 1, // Basic
    ]);

    $tool = new GetTeamSkillsTool;
    $result = $tool->execute(['team_id' => $this->team->id]);

    expect($result)->toBeArray();
    expect($result)->toHaveKey('team_skills');
    expect($result['team_skills'])->toBeArray();

    // Verify skill data structure
    foreach ($result['team_skills'] as $memberSkills) {
        expect($memberSkills)->toHaveKey('user_id');
        expect($memberSkills)->toHaveKey('user_name');
        expect($memberSkills)->toHaveKey('skills');
    }
});

test('GetTeamCapacityTool returns capacity information for team members', function () {
    // Create team members with capacity data
    $member1 = User::factory()->create([
        'capacity_hours_per_week' => 40,
        'current_workload_hours' => 10,
    ]);
    $member2 = User::factory()->create([
        'capacity_hours_per_week' => 32,
        'current_workload_hours' => 30,
    ]);

    $this->team->addUser($member1, 'member');
    $this->team->addUser($member2, 'member');

    $tool = new GetTeamCapacityTool;
    $result = $tool->execute(['team_id' => $this->team->id]);

    expect($result)->toBeArray();
    expect($result)->toHaveKey('team_capacity');

    foreach ($result['team_capacity'] as $memberCapacity) {
        expect($memberCapacity)->toHaveKey('user_id');
        expect($memberCapacity)->toHaveKey('user_name');
        expect($memberCapacity)->toHaveKey('capacity_hours_per_week');
        expect($memberCapacity)->toHaveKey('current_workload_hours');
        expect($memberCapacity)->toHaveKey('available_capacity');
    }
});
