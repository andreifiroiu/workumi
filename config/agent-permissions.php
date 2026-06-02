<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Tool Category to Permission Mapping
    |--------------------------------------------------------------------------
    |
    | This mapping defines which AgentConfiguration permission field is
    | required for tools in each category. When a tool is executed through
    | the ToolGateway, its category is used to determine which permission
    | must be enabled on the agent configuration.
    |
    */
    'category_permissions' => [
        'tasks' => 'can_modify_tasks',
        'work_orders' => 'can_create_work_orders',
        'projects' => 'can_create_work_orders',
        'client_data' => 'can_access_client_data',
        'email' => 'can_send_emails',
        'deliverables' => 'can_modify_deliverables',
        'financial' => 'can_access_financial_data',
        'playbooks' => 'can_modify_playbooks',
        'documents' => 'can_access_documents',
    ],

    /*
    |--------------------------------------------------------------------------
    | System-Level Approval Requirements
    |--------------------------------------------------------------------------
    |
    | These action types may require human approval based on GlobalAISettings.
    | The settings define whether certain high-risk actions should be blocked
    | until a human approves them.
    |
    | Mapping from action type to GlobalAISettings field:
    |
    */
    'approval_action_types' => [
        'external_sends' => 'require_approval_external_sends',
        'financial' => 'require_approval_financial',
        'contracts' => 'require_approval_contracts',
        'scope_changes' => 'require_approval_scope_changes',
    ],

    /*
    |--------------------------------------------------------------------------
    | Categories Requiring Approval
    |--------------------------------------------------------------------------
    |
    | Some tool categories inherently require human approval for their actions.
    | This maps categories to approval action types for enforcement.
    |
    */
    'category_approval_types' => [
        'email' => 'external_sends',
        'financial' => 'financial',
    ],
];
