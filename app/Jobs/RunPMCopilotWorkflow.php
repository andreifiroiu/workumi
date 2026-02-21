<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Agents\Workflows\PMCopilotWorkflow;
use App\Models\AgentWorkflowState;
use App\Services\AgentApprovalService;
use App\Services\AgentOrchestrator;
use App\Services\AgentRunner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queue job that runs the PM Copilot workflow asynchronously.
 *
 * Separated from the HTTP trigger to avoid gateway timeouts
 * when LLM calls take longer than the web server timeout.
 */
class RunPMCopilotWorkflow implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 1;

    /**
     * The job timeout in seconds (allow time for multiple LLM calls).
     */
    public int $timeout = 300;

    public function __construct(
        public readonly AgentWorkflowState $workflowState,
    ) {}

    /**
     * Execute the PM Copilot workflow to completion.
     */
    public function handle(
        AgentOrchestrator $orchestrator,
        AgentApprovalService $approvalService,
        AgentRunner $agentRunner,
    ): void {
        Log::info('RunPMCopilotWorkflow job started', [
            'workflow_state_id' => $this->workflowState->id,
        ]);

        try {
            $workflow = new PMCopilotWorkflow($orchestrator, $approvalService, $agentRunner);
            $workflow->setCurrentState($this->workflowState);
            $workflow->run();

            Log::info('RunPMCopilotWorkflow job completed', [
                'workflow_state_id' => $this->workflowState->id,
            ]);
        } catch (\Throwable $e) {
            Log::error('RunPMCopilotWorkflow job failed', [
                'workflow_state_id' => $this->workflowState->id,
                'error' => $e->getMessage(),
            ]);

            // Mark the workflow as failed so the frontend can show the error
            $this->workflowState->update([
                'state_data' => array_merge($this->workflowState->state_data ?? [], [
                    'error' => $e->getMessage(),
                ]),
                'completed_at' => now(),
            ]);

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('RunPMCopilotWorkflow job permanently failed', [
            'workflow_state_id' => $this->workflowState->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
