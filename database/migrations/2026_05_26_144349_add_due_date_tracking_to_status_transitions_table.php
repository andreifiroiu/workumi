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
        Schema::table('status_transitions', function (Blueprint $table) {
            $table->date('from_due_date')->nullable()->after('to_assigned_agent_id');
            $table->date('to_due_date')->nullable()->after('from_due_date');

            // Due-date changes (and assignment changes) can be performed by AI agents,
            // which are recorded with a null user_id. Allow that at the schema level.
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('status_transitions', function (Blueprint $table) {
            $table->dropColumn([
                'from_due_date',
                'to_due_date',
            ]);

            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });
    }
};
