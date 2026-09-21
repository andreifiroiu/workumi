<?php

use App\Providers\AgentServiceProvider;
use App\Providers\AppServiceProvider;
use App\Providers\FolioServiceProvider;
use App\Providers\FortifyServiceProvider;
use App\Providers\SeoServiceProvider;
use App\Providers\WorkumiMcpServiceProvider;

return [
    AgentServiceProvider::class,
    AppServiceProvider::class,
    FolioServiceProvider::class,
    FortifyServiceProvider::class,
    SeoServiceProvider::class,
    WorkumiMcpServiceProvider::class,
];
