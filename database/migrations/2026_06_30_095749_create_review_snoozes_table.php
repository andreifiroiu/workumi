<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('review_snoozes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('flow');
            $table->morphs('snoozable');
            $table->timestamp('snoozed_until');
            $table->timestamps();

            $table->unique(['user_id', 'flow', 'snoozable_type', 'snoozable_id'], 'review_snoozes_unique');
            $table->index(['flow', 'snoozable_type', 'snoozed_until']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_snoozes');
    }
};
