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
        Schema::table('users', function (Blueprint $table) {
            // Local hour (0-23) at which the daily task digest is sent in the user's timezone
            $table->unsignedTinyInteger('daily_digest_hour')->default(8)->after('timezone');

            // Guards against double-sends; stores the last local date a digest was sent
            $table->date('last_digest_sent_on')->nullable()->after('daily_digest_hour');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['daily_digest_hour', 'last_digest_sent_on']);
        });
    }
};
