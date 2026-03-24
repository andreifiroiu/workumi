# Spec Requirements: Document Management

## Initial Description

Enhance the existing document management capabilities in Workumi to provide scalable, feature-rich document handling for service teams.

### Proposed Features

1. **S3 Integration for Scalable Storage** - Move from local filesystem to S3-compatible storage for better scalability, reliability, and CDN distribution capabilities.

2. **Version Control for Deliverables** - Extend the existing DeliverableVersion system to provide comprehensive version history, comparison, and rollback capabilities.

3. **Document Preview** - In-app preview for common file types:
   - PDF documents
   - Images (PNG, JPG, GIF, SVG, WebP)
   - Common office formats (Word, Excel, PowerPoint)
   - Video files

4. **Commenting on Documents** - Allow team members to comment on documents for feedback, review, and collaboration.

5. **Folder Organization** - Enable hierarchical folder organization within projects for better document management.

### Existing Implementation

The codebase already has:
- `Document` model with polymorphic relationships (can attach to any documentable entity)
- `DocumentType` enum: Reference, Artifact, Evidence, Template
- `FileUploadService` with validation (50MB max, blocked dangerous extensions)
- `Deliverable` model with version tracking via `DeliverableVersion`
- File preview component supporting images, PDFs, and videos
- File uploader component with drag-and-drop
- Local filesystem storage via Laravel's public disk

## Requirements Discussion

### First Round Questions

**Q1:** For S3 integration, should we support multiple S3-compatible providers (AWS S3, Backblaze B2, DigitalOcean Spaces) or just AWS S3?
**Answer:** Use Laravel filesystem abstraction to support AWS S3 and S3-compatible providers (Backblaze B2, DigitalOcean Spaces). Migration from local storage will be handled manually outside the app.

**Q2:** For document preview, should office documents (Word/Excel/PowerPoint) support inline editing or view-only preview?
**Answer:** View-only previews for Office formats, PDFs, and images. No inline editing.

**Q3:** For the commenting system, should comments be thread-based (like discussions) or positional/annotation-based (pinned to specific locations)?
**Answer:** Both thread-level comments (on document as a whole, reusing existing CommunicationThread/Message pattern) AND positional/annotation comments for images and PDFs.

**Q4:** For positional annotations, what level of precision is needed?
**Answer:** For images: click-to-place markers that show comment threads. For PDFs: precise x/y positioning within a page if not too complicated, otherwise page-specific. Annotation markers should be visible to all viewers by default, with a toggle to hide/show annotations.

**Q5:** For folder structure, should folders be project-scoped, team-scoped, or both?
**Answer:** Project-scoped folders (primary) and team-scoped folders (secondary option). User chooses where to store documents when uploading.

**Q6:** Should version control apply to all documents or only deliverables?
**Answer:** Limited to deliverables only (use existing DeliverableVersion system). Regular documents don't need versioning.

**Q7:** For access control, should document permissions be inherited from parent entity or separately configurable?
**Answer:** Inherit from parent entity. View project = view project documents. View team = view team documents.

**Q8:** Do you need external sharing capabilities (shareable links for clients)?
**Answer:** Yes. Create shareable links for external users (clients) with: user-configurable expiration (number of days OR permanent/no expiration), view AND download permissions allowed, optional password protection (user decides), and access tracking (system tracks when external users access shared documents - timestamp, IP, etc.).

### Existing Code to Reference

**Similar Features Identified:**
- Model: `Document` - Path: `app/Models/Document.php`
- Model: `Deliverable` with `DeliverableVersion` - Paths: `app/Models/Deliverable.php`, `app/Models/DeliverableVersion.php`
- Service: `FileUploadService` - Path: `app/Services/FileUploadService.php`
- Models: `CommunicationThread` and `Message` - Paths: `app/Models/CommunicationThread.php`, `app/Models/Message.php`
- Component: `file-preview.tsx` - Path: `resources/js/components/file-preview.tsx`
- Component: `file-uploader.tsx` - Path: `resources/js/components/file-uploader.tsx`
- Controller: `DeliverableVersionController` - Path: `app/Http/Controllers/DeliverableVersionController.php`

### Follow-up Questions

No follow-up questions were needed.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A

## Requirements Summary

### Functional Requirements

**S3 Storage Integration:**
- Use Laravel filesystem abstraction for S3 and S3-compatible providers
- Support AWS S3, Backblaze B2, DigitalOcean Spaces
- Manual migration of existing local files (outside app scope)

**Document Preview:**
- View-only preview for Office formats (Word, Excel, PowerPoint)
- View-only preview for PDFs
- View-only preview for images
- No inline editing capabilities

**Commenting System:**
- Thread-level comments on documents as a whole
- Reuse existing CommunicationThread/Message pattern for thread comments
- Positional/annotation comments for images (click-to-place markers)
- Positional/annotation comments for PDFs (x/y positioning within page, or page-specific fallback)
- Annotation markers visible to all viewers by default
- Toggle to hide/show annotations

**Folder Organization:**
- Project-scoped folders (primary storage location)
- Team-scoped folders (secondary storage location)
- User selects storage location during upload

**Version Control:**
- Limited to deliverables only
- Leverage existing DeliverableVersion system
- Regular documents do not require versioning

**Access Control:**
- Permissions inherited from parent entity
- Project document access = project access
- Team document access = team access

**External Sharing:**
- Shareable links for external users (clients)
- User-configurable expiration (days or permanent)
- View and download permissions allowed
- Optional password protection
- Access tracking (timestamp, IP address, etc.)

### Reusability Opportunities

- **Document model and migrations** - Extend existing polymorphic document system
- **FileUploadService** - Adapt for S3 storage operations
- **CommunicationThread/Message models** - Reuse for thread-level document commenting
- **file-preview.tsx component** - Extend for office document preview
- **file-uploader.tsx component** - Enhance with folder selection
- **DeliverableVersionController** - Reference patterns for version management

### Scope Boundaries

**In Scope:**
- S3 integration via Laravel filesystem abstraction
- View-only document preview for Office, PDF, and images
- Thread-level commenting using existing models
- Positional annotation comments for images and PDFs
- Project-scoped and team-scoped folder organization
- Version control for deliverables (existing system)
- Inherited access control from parent entities
- External sharing with expiration, optional password, and access tracking

**Out of Scope:**
- Real-time collaborative editing
- OCR/text extraction from images
- Document signing/e-signatures
- Migration admin tool (manual migration only)
- Inline document editing
- Version control for regular (non-deliverable) documents

### Technical Considerations

- Use Laravel filesystem abstraction for storage provider flexibility
- Leverage existing CommunicationThread/Message pattern for commenting
- Extend existing DeliverableVersion system (no new versioning architecture needed)
- Office document preview may require external service or library (e.g., Microsoft Office Online viewer, Google Docs viewer, or server-side conversion)
- PDF annotation positioning should store page number plus x/y coordinates
- External share links require new model for tracking access and managing link settings
- Consider signed URLs for secure S3 file access
