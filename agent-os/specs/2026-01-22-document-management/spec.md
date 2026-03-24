# Specification: Document Management

## Goal

Enhance Workumi's document management with S3 storage, view-only document previews, dual commenting systems (thread-level and positional annotations), hierarchical folder organization, and secure external sharing capabilities.

## User Stories

- As a team member, I want to organize documents in folders within projects or team spaces so that I can quickly find and manage related files.
- As a reviewer, I want to add comments to specific locations on images and PDFs so that I can provide precise feedback without ambiguity.
- As a project manager, I want to share documents externally with clients via secure, expiring links so that I can collaborate without granting system access.

## Specific Requirements

**S3 Storage Integration**
- Configure Laravel filesystem to use S3 disk as default for document storage
- Support AWS S3, Backblaze B2, and DigitalOcean Spaces via S3-compatible configuration
- Use signed URLs for secure, time-limited file access (default 60 minutes expiration)
- Store files with path pattern: `{team_id}/{context}/{entity_id}/{filename}` where context is "projects" or "team-files"
- Extend `FileUploadService` to accept a configurable disk parameter, defaulting to S3
- Keep existing validation (50MB max, blocked extensions) unchanged

**Document Preview Enhancement**
- Add Office document preview using Microsoft Office Online Viewer embed (view.officeapps.live.com)
- Office formats supported: .doc, .docx, .xls, .xlsx, .ppt, .pptx
- Extend `FilePreview` component with new OFFICE_MIME_TYPES constant for Office file detection
- Generate public signed URLs for Office viewer to access documents
- All previews are view-only; no inline editing capability
- Fallback to download button if preview fails or format unsupported

**Thread-Level Document Comments**
- Attach `CommunicationThread` to documents via existing polymorphic `threadable` relationship
- Add `HasCommunicationThread` trait to Document model (if not exists) or define relationship directly
- Create `DocumentCommentController` to manage thread comments with standard CRUD operations
- Reuse existing `Message` model and message input components for consistency
- Display thread comments in a collapsible panel alongside document preview

**Positional Annotation Comments**
- Create `DocumentAnnotation` model with fields: `document_id`, `page` (nullable for images), `x_percent`, `y_percent`, `communication_thread_id`, `created_by_id`
- Store coordinates as percentages (0-100) for responsive positioning across screen sizes
- For PDFs: store page number plus x/y position; for images: store only x/y position
- Each annotation marker links to its own `CommunicationThread` for threaded replies
- Build `AnnotationLayer` React component that overlays clickable markers on preview
- Include toggle control to show/hide all annotation markers (visible by default)
- Clicking a marker opens the associated comment thread in a popover or side panel

**Folder Organization**
- Create `Folder` model with fields: `team_id`, `project_id` (nullable), `parent_id` (nullable for self-referential nesting), `name`, `created_by_id`
- Project-scoped folders: `project_id` is set; Team-scoped folders: `project_id` is null
- Add `folder_id` (nullable) column to `documents` table for folder assignment
- Build `FolderController` with CRUD operations and nested folder listing
- Create `FolderTree` React component for sidebar navigation with expand/collapse
- Add folder selection dropdown to file uploader component during upload flow
- Limit folder nesting depth to 3 levels for UI simplicity

**External Sharing**
- Create `DocumentShareLink` model with fields: `document_id`, `token` (unique, 64 chars), `expires_at` (nullable for permanent), `password_hash` (nullable), `allow_download`, `created_by_id`
- Create `DocumentShareAccess` model for tracking: `share_link_id`, `accessed_at`, `ip_address`, `user_agent`
- Generate cryptographically secure tokens using `Str::random(64)`
- Build public `SharedDocumentController` for external access (no auth required)
- Password verification via `Hash::check()` if password is set on the share link
- Track each access event with timestamp, IP, and user agent
- Create `ShareLinkDialog` React component with expiration picker (days or permanent), optional password field, and download toggle
- Display access log in a table within the share link management panel

**Access Control**
- Document access inherits from parent entity: project documents require project view permission, team documents require team membership
- Folder access inherits from its scope: project folders follow project permissions, team folders follow team permissions
- External share links bypass normal auth but enforce their own password and expiration rules
- Add policy methods to `DocumentPolicy`: `view`, `create`, `update`, `delete`, `share`

## Visual Design

No visual assets provided.

## Existing Code to Leverage

**Document Model and Polymorphic Pattern**
- Located at `app/Models/Document.php` with `documentable` morphTo relationship
- Extend with `folder_id` foreign key and `folder()` belongsTo relationship
- Reuse `forTeam` scope pattern for filtering
- Add `thread()` morphOne relationship to CommunicationThread

**CommunicationThread and Message Models**
- Located at `app/Models/CommunicationThread.php` and `app/Models/Message.php`
- Reuse `addMessage()` method for creating comments on both thread-level and annotation threads
- Follow same pattern: create thread first, then add messages to it
- Message model supports `mentions`, `attachments`, and `reactions` relationships

**FileUploadService**
- Located at `app/Services/FileUploadService.php` with validation and storage methods
- Refactor `storeDeliverableVersion` to accept disk parameter for S3 support
- Add new `storeDocument` method for general document uploads with folder path support
- Keep `validateFile` method unchanged for consistency

**DeliverableVersionController Pattern**
- Located at `app/Http/Controllers/Work/DeliverableVersionController.php`
- Follow same authorization pattern using `$this->authorize()` calls
- Use FileUploadRequest for file validation
- Return JSON or Inertia redirect based on request type

**FilePreview and FileUploader Components**
- Located at `resources/js/components/work/file-preview.tsx` and `file-uploader.tsx`
- Extend FilePreview with Office format detection and iframe embed for Office Online viewer
- Add folder selection prop to FileUploader component
- Maintain existing drag-and-drop and validation behavior

## Out of Scope

- Real-time collaborative editing of documents
- OCR or text extraction from images
- Document signing or e-signature workflows
- Migration admin tool for moving local files to S3 (manual process)
- Inline document editing of any kind
- Version control for regular documents (only deliverables have versions)
- Bulk operations on documents or folders
- Document search or full-text indexing
- Automatic thumbnail generation for documents
- Document approval workflows (use existing InboxItem system if needed)
