<?php

namespace App\Logging;

use Monolog\Handler\AbstractProcessingHandler;
use Monolog\LogRecord;

class DiscordWebhookHandler extends AbstractProcessingHandler
{
    public function __construct(
        private ?string $webhookUrl,
        private string $username = 'Laravel',
        int|string $level = \Monolog\Level::Error,
        bool $bubble = true,
    ) {
        parent::__construct($level, $bubble);
    }

    protected function write(LogRecord $record): void
    {
        if (empty($this->webhookUrl)) {
            return;
        }

        $colors = [
            'DEBUG' => 0x95A5A6,
            'INFO' => 0x3498DB,
            'NOTICE' => 0x2ECC71,
            'WARNING' => 0xF39C12,
            'ERROR' => 0xE74C3C,
            'CRITICAL' => 0xC0392B,
            'ALERT' => 0x992D22,
            'EMERGENCY' => 0x000000,
        ];

        $message = mb_substr($record->message, 0, 2000);
        $context = ! empty($record->context)
            ? "```\n".mb_substr(json_encode($record->context, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), 0, 1500)."\n```"
            : null;

        $payload = [
            'username' => $this->username,
            'embeds' => [[
                'title' => $record->level->name.' • '.config('app.name'),
                'description' => $message,
                'color' => $colors[$record->level->name] ?? 0x95A5A6,
                'timestamp' => $record->datetime->format('c'),
                'fields' => array_values(array_filter([
                    $context ? ['name' => 'Context', 'value' => $context] : null,
                    ['name' => 'Environment', 'value' => app()->environment(), 'inline' => true],
                ])),
            ]],
        ];

        $ch = curl_init($this->webhookUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 5,
        ]);
        curl_exec($ch);
        curl_close($ch);
    }
}
