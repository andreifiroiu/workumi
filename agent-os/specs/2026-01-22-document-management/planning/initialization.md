# Document Management Feature

## Initial Description

Enhance the existing document management capabilities in Workumi to provide scalable, feature-rich document handling for service teams.

## Proposed Features

1. **S3 Integration for Scalable Storage** - Move from local filesystem to S3-compatible storage for better scalability, reliability, and CDN distribution capabilities.

2. **Version Control for Deliverables** - Extend the existing DeliverableVersion system to provide comprehensive version history, comparison, and rollback capabilities.

3. **Document Preview** - In-app preview for common file types:
   - PDF documents
   - Images (PNG, JPG, GIF, SVG, WebP)
   - Common office formats (Word, Excel, PowerPoint)
   - Video files

4. **Commenting on Documents** - Allow team members to comment on documents for feedback, review, and collaboration.

5. **Folder Organization** - Enable hierarchical folder organization within projects for better document management.

## Existing Implementation

The codebase already has:
- `Document` model with polymorphic relationships (can attach to any documentable entity)
- `DocumentType` enum: Reference, Artifact, Evidence, Template
- `FileUploadService` with validation (50MB max, blocked dangerous extensions)
- `Deliverable` model with version tracking via `DeliverableVersion`
- File preview component supporting images, PDFs, and videos
- File uploader component with drag-and-drop
- Local filesystem storage via Laravel's public disk

## Context from Exploration

- Documents currently attach to projects and deliverables via morph relationships
- DeliverableVersion tracks file versions with version_number, file_url, file_name, file_size, mime_type, notes
- FileUploadService handles validation and storage to public disk
- Frontend has basic preview for images, PDFs, and videos
- No current support for office document preview
- No commenting system on documents
- No folder/hierarchical organization
- Storage is local filesystem only
