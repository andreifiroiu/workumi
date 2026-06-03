<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('notification_preferences', function (Blueprint $table) {
            $table->boolean('email_daily_digest')->default(true)->after('email_agent_activity');
            $table->boolean('push_daily_digest')->default(false)->after('push_agent_activity');
            $table->boolean('slack_daily_digest')->default(false)->after('slack_agent_activity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notification_preferences', function (Blueprint $table) {
            $table->dropColumn(['email_daily_digest', 'push_daily_digest', 'slack_daily_digest']);
        });
    }
};
