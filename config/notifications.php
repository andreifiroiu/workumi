<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Delivery Channels
    |--------------------------------------------------------------------------
    |
    | The channels shown as columns in the notification preferences matrix.
    | Channels with 'enabled' => false are rendered as read-only (disabled)
    | toggles until the delivery channel is actually implemented.
    |
    */

    'channels' => [
        'email' => ['label' => 'Email', 'enabled' => true],
        'push' => ['label' => 'Push', 'enabled' => false],
        'slack' => ['label' => 'Slack', 'enabled' => true],
    ],

    /*
    |--------------------------------------------------------------------------
    | Notification Types
    |--------------------------------------------------------------------------
    |
    | The notification types shown as rows in the matrix. Each key matches the
    | column suffix on the notification_preferences table (e.g. 'daily_digest'
    | maps to email_daily_digest / push_daily_digest / slack_daily_digest).
    | Types with 'enabled' => false are hidden from the matrix entirely.
    |
    */

    'types' => [
        'project_updates' => [
            'label' => 'Project Updates',
            'description' => 'Updates about project status and progress',
            'enabled' => true,
        ],
        'task_assignments' => [
            'label' => 'Task Assignments',
            'description' => 'When tasks are assigned to you',
            'enabled' => true,
        ],
        'approval_requests' => [
            'label' => 'Approval Requests',
            'description' => 'When your approval is needed',
            'enabled' => true,
        ],
        'blockers' => [
            'label' => 'Blockers',
            'description' => 'When work is blocked',
            'enabled' => true,
        ],
        'deadlines' => [
            'label' => 'Deadlines',
            'description' => 'Upcoming and overdue deadlines',
            'enabled' => true,
        ],
        'daily_digest' => [
            'label' => 'Daily Digest',
            'description' => 'A daily summary of your tasks due today or overdue',
            'enabled' => true,
        ],
        'weekly_digest' => [
            'label' => 'Weekly Digest',
            'description' => 'Summary of the week',
            'enabled' => true,
        ],
        'agent_activity' => [
            'label' => 'AI Agent Activity',
            'description' => 'Agent runs and outputs',
            'enabled' => true,
        ],
    ],

];
