<?php

declare(strict_types=1);

namespace App\Mcp;

class TeamContext
{
    public function __construct(public readonly int $teamId) {}
}
