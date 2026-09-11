<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Documents may exist without a parent entity. The documents index already lists
 * unfiled documents via `whereNull('documentable_type')`, but the original
 * `morphs()` call made both columns NOT NULL, so that listing could never match.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('documentable_type')->nullable()->change();
            $table->unsignedBigInteger('documentable_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('documentable_type')->nullable(false)->change();
            $table->unsignedBigInteger('documentable_id')->nullable(false)->change();
        });
    }
};
