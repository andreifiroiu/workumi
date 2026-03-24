# Task Breakdown: Document Management

## Overview

This feature enhances Workumi's document management with S3 storage, view-only document previews, dual commenting systems (thread-level and positional annotations), hierarchical folder organization, and secure external sharing capabilities.

**Total Tasks:** 49 sub-tasks across 7 task groups

**Estimated Complexity:** High - involves storage infrastructure, multiple new models, complex UI components, and external access patterns

## Task List

### Storage & Infrastructure

#### Task Group 1: S3 Storage Integration
**Dependencies:** None
**Complexity:** Medium

- [x] 1.0 Complete S3 storage integration
  - [x] 1.1 Write 4-6 focused tests for S3 storage functionality
    - Test signed URL generation with default 60-minute expiration
    - Test file upload to S3 disk via FileUploadService
    - Test file path pattern: `{team_id}/{context}/{entity_id}/{filename}`
    - Test configurable disk parameter (S3 vs local fallback)
  - [x] 1.2 Configure Laravel filesystem for S3 storage
    - Add S3 configuration to `config/filesystems.php`
    - Support AWS S3, Backblaze B2, DigitalOcean Spaces via S3-compatible config
    - Add environment variables for S3 credentials and bucket settings
    - Set S3 as default disk for document storage
  - [x] 1.3 Extend FileUploadService for S3 support
    - Refactor `storeDeliverableVersion` to accept disk parameter
    - Add new `storeDocument` method for general document uploads
    - Implement path pattern: `{team_id}/{context}/{entity_id}/{filename}`
    - Keep existing `validateFile` method unchanged (50MB max, blocked extensions)
  - [x] 1.4 Implement signed URL generation
    - Add `getSignedUrl` method to FileUploadService
    - Default expiration: 60 minutes
    - Support configurable expiration for different use cases
    - Handle public URLs for Office Online viewer
  - [x] 1.5 Ensure S3 storage tests pass
    - Run ONLY the 4-6 tests written in 1.1
    - Mock S3 client for testing (no real S3 calls in tests)
    - Verify file operations work with configured disk

**Acceptance Criteria:**
- The 4-6 tests written in 1.1 pass
- Files upload to S3 with correct path pattern
- Signed URLs generate with appropriate expiration
- Existing validation rules remain intact

---

### Database Layer

#### Task Group 2: Data Models and Migrations
**Dependencies:** Task Group 1
**Complexity:** High

- [x] 2.0 Complete database layer for document management
  - [x] 2.1 Write 6-8 focused tests for new models
    - Test Folder model: nested folder creation (max 3 levels)
    - Test Folder model: project-scoped vs team-scoped folders
    - Test DocumentAnnotation model: coordinate storage (x/y percentages)
    - Test DocumentAnnotation model: association with CommunicationThread
    - Test DocumentShareLink model: token generation and expiration
    - Test DocumentShareAccess model: access tracking creation
  - [x] 2.2 Create Folder model and migration
    - Fields: `id`, `team_id`, `project_id` (nullable), `parent_id` (nullable), `name`, `created_by_id`, `timestamps`
    - Self-referential relationship for nested folders
    - Add indexes on `team_id`, `project_id`, `parent_id`
    - Add foreign key constraints with cascade delete behavior
  - [x] 2.3 Create DocumentAnnotation model and migration
    - Fields: `id`, `document_id`, `page` (nullable for images), `x_percent`, `y_percent`, `communication_thread_id`, `created_by_id`, `timestamps`
    - Store coordinates as decimal percentages (0-100)
    - Add foreign keys to documents, communication_threads, users
    - Add composite index on `document_id`, `page`
  - [x] 2.4 Create DocumentShareLink model and migration
    - Fields: `id`, `document_id`, `token` (unique, 64 chars), `expires_at` (nullable), `password_hash` (nullable), `allow_download`, `created_by_id`, `timestamps`
    - Generate token using `Str::random(64)`
    - Add unique index on `token`
    - Add foreign key to documents
  - [x] 2.5 Create DocumentShareAccess model and migration
    - Fields: `id`, `document_share_link_id`, `accessed_at`, `ip_address`, `user_agent`, `timestamps`
    - Add index on `document_share_link_id` for efficient lookup
    - Add foreign key with cascade delete
  - [x] 2.6 Extend Document model with folder relationship
    - Add `folder_id` (nullable) column to documents table via migration
    - Add `folder()` belongsTo relationship to Document model
    - Add `thread()` morphOne relationship to CommunicationThread
    - Add `annotations()` hasMany relationship to DocumentAnnotation
    - Add `shareLinks()` hasMany relationship to DocumentShareLink
  - [x] 2.7 Set up model relationships and scopes
    - Folder: `documents()`, `children()`, `parent()`, `team()`, `project()`, `creator()`
    - DocumentAnnotation: `document()`, `thread()`, `creator()`
    - DocumentShareLink: `document()`, `accesses()`, `creator()`
    - Add `forTeam` scope to Folder model
    - Add scope for active (non-expired) share links
  - [x] 2.8 Ensure database layer tests pass
    - Run ONLY the 6-8 tests written in 2.1
    - Verify all migrations run successfully
    - Verify associations work correctly

**Acceptance Criteria:**
- The 6-8 tests written in 2.1 pass
- All migrations run without errors
- Model relationships query correctly
- Folder nesting respects 3-level limit
- Share link tokens are cryptographically secure

---

### API Layer

#### Task Group 3: Controllers and Policies
**Dependencies:** Task Group 2
**Complexity:** High

- [x] 3.0 Complete API layer for document management
  - [x] 3.1 Write 6-8 focused tests for API endpoints
    - Test FolderController: CRUD operations with proper authorization
    - Test FolderController: nested folder listing
    - Test DocumentAnnotationController: create annotation with thread
    - Test DocumentShareLinkController: create and revoke share links
    - Test SharedDocumentController: public access with valid token
    - Test SharedDocumentController: password verification and access tracking
  - [x] 3.2 Create FolderController with CRUD operations
    - Actions: index, store, show, update, destroy
    - Support nested folder listing with expand/collapse data
    - Follow pattern from existing controllers using `$this->authorize()`
    - Return JSON for AJAX or Inertia redirect based on request type
  - [x] 3.3 Create DocumentCommentController for thread-level comments
    - Actions: index, store, update, destroy
    - Reuse existing `Message` model for creating comments
    - Auto-create `CommunicationThread` if not exists on document
    - Follow existing CommunicationThread patterns
  - [x] 3.4 Create DocumentAnnotationController for positional comments
    - Actions: index, store, update, destroy
    - Create `CommunicationThread` for each new annotation
    - Store coordinates as percentages (0-100)
    - Include page number for PDFs, null for images
  - [x] 3.5 Create DocumentShareLinkController for managing share links
    - Actions: index, store, update, destroy
    - Generate cryptographically secure tokens with `Str::random(64)`
    - Hash passwords with `Hash::make()` if provided
    - Return access log data for management panel
  - [x] 3.6 Create SharedDocumentController for external access
    - Public routes (no auth required)
    - Actions: show (validate token, optional password check)
    - Track access with IP, user agent, timestamp
    - Generate signed URL for document access
    - Respect allow_download flag
  - [x] 3.7 Implement DocumentPolicy authorization
    - Methods: view, create, update, delete, share
    - Document access inherits from parent entity
    - Project documents require project view permission
    - Team documents require team membership
  - [x] 3.8 Implement FolderPolicy authorization
    - Methods: view, create, update, delete
    - Project folders follow project permissions
    - Team folders follow team permissions
  - [x] 3.9 Ensure API layer tests pass
    - Run ONLY the 6-8 tests written in 3.1
    - Verify authorization is properly enforced
    - Verify response formats are consistent

**Acceptance Criteria:**
- The 6-8 tests written in 3.1 pass
- All CRUD operations work correctly
- Authorization properly enforces access rules
- External sharing works without authentication
- Access tracking records all external views

---

### Frontend Components - Core

#### Task Group 4: File Preview and Folder Navigation
**Dependencies:** Task Group 3
**Complexity:** Medium

- [x] 4.0 Complete core frontend components
  - [x] 4.1 Write 4-6 focused tests for core UI components
    - Test FilePreview: Office document detection and iframe embed
    - Test FilePreview: fallback to download button on unsupported format
    - Test FolderTree: expand/collapse navigation behavior
    - Test FileUploader: folder selection during upload
  - [x] 4.2 Extend FilePreview component for Office documents
    - Add OFFICE_MIME_TYPES constant for .doc, .docx, .xls, .xlsx, .ppt, .pptx
    - Use Microsoft Office Online Viewer embed (view.officeapps.live.com)
    - Generate public signed URLs for Office viewer access
    - Maintain existing PDF, image, and video preview support
    - Implement fallback to download button if preview fails
  - [x] 4.3 Create FolderTree component for sidebar navigation
    - Display hierarchical folder structure with expand/collapse
    - Support project-scoped and team-scoped folders
    - Handle folder selection for filtering documents
    - Respect 3-level nesting depth limit
    - Follow existing sidebar component patterns (280px width)
  - [x] 4.4 Extend FileUploader with folder selection
    - Add folder dropdown during upload flow
    - Support creating new folder inline if needed
    - Maintain existing drag-and-drop behavior
    - Keep existing validation (50MB max, blocked extensions)
  - [x] 4.5 Create FolderManagement component
    - Support folder CRUD operations (create, rename, delete)
    - Handle folder move/reorganization
    - Display folder metadata and document count
  - [x] 4.6 Ensure core UI tests pass
    - Run ONLY the 4-6 tests written in 4.1
    - Verify Office preview embeds correctly
    - Verify folder navigation works

**Acceptance Criteria:**
- The 4-6 tests written in 4.1 pass
- Office documents preview via Microsoft viewer
- Folder tree displays with proper expand/collapse
- File uploader allows folder selection
- Unsupported formats show download fallback

---

### Frontend Components - Comments & Annotations

#### Task Group 5: Commenting and Annotation System
**Dependencies:** Task Group 4
**Complexity:** High

- [x] 5.0 Complete commenting and annotation components
  - [x] 5.1 Write 4-6 focused tests for comment/annotation components
    - Test DocumentComments: display thread in collapsible panel
    - Test AnnotationLayer: marker positioning on images
    - Test AnnotationLayer: marker positioning on PDFs with page tracking
    - Test AnnotationMarker: click to open comment thread
  - [x] 5.2 Create DocumentComments component for thread-level comments
    - Display thread comments in collapsible panel alongside preview
    - Reuse existing message input components for consistency
    - Support adding, editing, and deleting comments
    - Follow existing CommunicationThread UI patterns
  - [x] 5.3 Create AnnotationLayer component for visual overlay
    - Overlay clickable markers on document preview
    - Calculate positions using percentage coordinates (responsive)
    - Handle page-specific positioning for PDFs
    - Include toggle control to show/hide all annotation markers
    - Default state: annotations visible
  - [x] 5.4 Create AnnotationMarker component
    - Visual indicator (pin/dot) at annotation position
    - Click handler to open associated comment thread
    - Support hover state showing preview of comment
    - Display marker number or user indicator
  - [x] 5.5 Create AnnotationPopover component for annotation threads
    - Display comment thread for specific annotation
    - Support adding replies to annotation thread
    - Position relative to marker (popover or side panel)
    - Close on click outside or explicit dismiss
  - [x] 5.6 Integrate annotation click-to-create functionality
    - Click on document to place new annotation marker
    - Open popover to add initial comment
    - Calculate and store percentage coordinates from click position
    - For PDFs: capture current page number
  - [x] 5.7 Ensure comment/annotation tests pass
    - Run ONLY the 4-6 tests written in 5.1
    - Verify thread comments display correctly
    - Verify annotation markers position accurately

**Acceptance Criteria:**
- The 4-6 tests written in 5.1 pass
- Thread-level comments work in collapsible panel
- Annotation markers display at correct positions
- Click-to-create places markers with threads
- Toggle hides/shows all annotations

---

### Frontend Components - External Sharing

#### Task Group 6: External Sharing UI
**Dependencies:** Task Group 5
**Complexity:** Medium

- [x] 6.0 Complete external sharing components
  - [x] 6.1 Write 4-6 focused tests for sharing components
    - Test ShareLinkDialog: create link with expiration options
    - Test ShareLinkDialog: password field toggle
    - Test ShareLinkDialog: download permission toggle
    - Test SharedDocumentPage: public view with password prompt
  - [x] 6.2 Create ShareLinkDialog component
    - Expiration picker: days (1, 7, 30, 90, custom) or permanent
    - Optional password field with show/hide toggle
    - Download toggle (allow_download checkbox)
    - Copy link to clipboard functionality
    - Display generated link after creation
  - [x] 6.3 Create ShareLinkManagement component
    - List all share links for a document
    - Display link status (active, expired)
    - Show created date and expiration
    - Revoke/delete link action
    - View access log button
  - [x] 6.4 Create AccessLogTable component
    - Display access events in table format
    - Columns: accessed_at, IP address, user agent
    - Sort by most recent first
    - Pagination for large access logs
  - [x] 6.5 Create SharedDocumentPage for public access
    - Public route (no auth layout)
    - Password prompt if password-protected
    - Display document preview (view-only)
    - Conditional download button based on allow_download
    - Handle expired link error state
  - [x] 6.6 Ensure sharing UI tests pass
    - Run ONLY the 4-6 tests written in 6.1
    - Verify share link creation works
    - Verify public document page displays correctly

**Acceptance Criteria:**
- The 4-6 tests written in 6.1 pass
- Share links create with all options
- Access log displays tracking data
- Public view works without authentication
- Password protection enforces access control

---

### Testing

#### Task Group 7: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-6
**Complexity:** Low

- [x] 7.0 Review existing tests and fill critical gaps only
  - [x] 7.1 Review tests from Task Groups 1-6
    - Review the 6 tests written by backend (Task 1.1) in tests/Feature/Storage/S3StorageTest.php
    - Review the 7 tests written by backend (Task 2.1) in tests/Feature/Documents/DocumentModelsTest.php
    - Review the 8 tests written by backend (Task 3.1) in tests/Feature/Documents/DocumentApiTest.php
    - Review the 10 tests written by frontend (Task 4.1) in resources/js/components/documents/__tests__/document-ui-components.test.tsx
    - Review the 11 tests written by frontend (Task 5.1) in resources/js/components/documents/__tests__/commenting-annotation.test.tsx
    - Review the 11 tests written by frontend (Task 6.1) in resources/js/components/documents/__tests__/external-sharing.test.tsx
    - Total existing tests: approximately 53 tests
  - [x] 7.2 Analyze test coverage gaps for document management feature only
    - Identify critical user workflows that lack test coverage
    - Focus ONLY on gaps related to this spec's feature requirements
    - Prioritize end-to-end workflows over unit test gaps
    - Key workflows to verify coverage:
      - Upload document to folder via S3
      - Add thread-level comment to document
      - Create annotation on PDF with page position
      - Share document externally with password
      - Access shared document and track access
  - [x] 7.3 Write up to 10 additional strategic tests maximum
    - Add maximum of 10 new tests to fill identified critical gaps
    - Focus on integration points and end-to-end workflows
    - Skip edge cases, performance tests, and accessibility tests unless business-critical
    - Potential gap areas:
      - Full upload-to-preview flow
      - Annotation positioning accuracy across different view sizes
      - Share link expiration enforcement
      - Access control inheritance verification
  - [x] 7.4 Run feature-specific tests only
    - Run ONLY tests related to document management feature
    - Expected total: approximately 38-50 tests maximum
    - Do NOT run the entire application test suite
    - Verify critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 38-50 tests total)
- Critical user workflows for document management are covered
- No more than 10 additional tests added when filling in testing gaps
- Testing focused exclusively on this spec's feature requirements

---

## Execution Order

Recommended implementation sequence based on dependencies:

1. **Task Group 1: S3 Storage Integration** - Foundation for all file storage
2. **Task Group 2: Data Models and Migrations** - Database layer for new entities
3. **Task Group 3: Controllers and Policies** - API endpoints and authorization
4. **Task Group 4: File Preview and Folder Navigation** - Core UI components
5. **Task Group 5: Commenting and Annotation System** - Advanced UI features
6. **Task Group 6: External Sharing UI** - Public access components
7. **Task Group 7: Test Review and Gap Analysis** - Final validation

## Technical Notes

### Existing Code to Leverage

| Pattern | Location | Usage |
|---------|----------|-------|
| Document model | `app/Models/Document.php` | Extend with folder_id, thread(), annotations() |
| CommunicationThread | `app/Models/CommunicationThread.php` | Reuse for comments |
| FileUploadService | `app/Services/FileUploadService.php` | Extend for S3 support |
| DeliverableVersionController | `app/Http/Controllers/Work/DeliverableVersionController.php` | Pattern for authorization |
| FilePreview | `resources/js/components/work/file-preview.tsx` | Extend for Office formats |
| FileUploader | `resources/js/components/work/file-uploader.tsx` | Add folder selection |

### Key Technical Decisions

- **Coordinates as percentages**: Enables responsive positioning across screen sizes
- **Signed URLs**: Secure time-limited access to S3 files (60-minute default)
- **Token generation**: 64-character cryptographically secure tokens via `Str::random(64)`
- **Password hashing**: Use Laravel's `Hash::make()` and `Hash::check()` for share link passwords
- **Folder nesting limit**: 3 levels maximum for UI simplicity
- **Office preview**: Microsoft Office Online Viewer embed (view.officeapps.live.com)

### Routes to Add

```php
// Folder routes (authenticated)
Route::resource('folders', FolderController::class);

// Document comments (authenticated)
Route::resource('documents.comments', DocumentCommentController::class);

// Document annotations (authenticated)
Route::resource('documents.annotations', DocumentAnnotationController::class);

// Share links (authenticated)
Route::resource('documents.share-links', DocumentShareLinkController::class);

// Public shared document access (no auth)
Route::get('shared/{token}', [SharedDocumentController::class, 'show'])->name('shared.document');
Route::post('shared/{token}/verify', [SharedDocumentController::class, 'verify'])->name('shared.verify');
```
