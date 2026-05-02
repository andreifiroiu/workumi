<?php

namespace App\Observers;

use App\Models\Document;
use Illuminate\Support\Facades\Storage;

class DocumentObserver
{
    public function forceDeleting(Document $document): void
    {
        Storage::delete($document->file_url);
    }
}
