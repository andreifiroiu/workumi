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
        Schema::table('global_ai_settings', function (Blueprint $table) {
            // Daily task digest emails (opt-in, defaults to false)
            $table->boolean('daily_task_digest_enabled')
                ->default(false)
                ->after('client_comms_auto_draft');

            // Inbound email -> Dispatcher Agent processing (opt-in, defaults to false)
            $table->boolean('inbound_email_enabled')
                ->default(false)
                ->after('daily_task_digest_enabled');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('global_ai_settings', function (Blueprint $table) {
            $table->dropColumn(['daily_task_digest_enabled', 'inbound_email_enabled']);
        });
    }
};
