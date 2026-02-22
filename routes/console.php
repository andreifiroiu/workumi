<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Agent Scheduled Tasks
|--------------------------------------------------------------------------
|
| Schedule agent-related commands to run at specific times.
|
*/

// Reset daily spend for all agent configurations at midnight
Schedule::command('agents:reset-daily-spend')->daily();

// Generate weekly client communication summaries every Monday at 9am
Schedule::command('client-comms:weekly-summaries')->weeklyOn(1, '09:00');
