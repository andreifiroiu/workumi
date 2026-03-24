# Spec Requirements: Deliverable Management UI

## Initial Description

Build a comprehensive Deliverable Management UI for Workumi that allows team members to manage deliverables tied to work orders, including file upload functionality, version history, draft/final status workflow, and file preview capabilities.

## Requirements Discussion

### First Round Questions

**Q1:** File upload requirements - what file types should be accepted and what's the maximum file size?
**Answer:** Accept any file type EXCEPT executables and dangerous files. Increase size limit to 50MB (from current 10MB limit).

**Q2:** Where should uploaded files be stored - local filesystem or cloud storage (S3)?
**Answer:** Continue with local storage for now (no S3 integration needed).

**Q3:** Should version history be a simple version string or a proper versioning system with version records?
**Answer:** Implement a proper versioning system where each file upload creates a new version record, allowing users to browse and restore previous versions.

**Q4:** What version history viewing capabilities are needed - simple list or diff/comparison?
**Answer:** Just viewing the version list with timestamps and notes is sufficient - no diff/comparison functionality needed.

**Q5:** Who should be able to change draft/final status - restricted roles or any team member?
**Answer:** Keep open permissions for now - any team member can change status.

**Q6:** Should status changes trigger notifications to relevant team members?
**Answer:** Yes, trigger notifications to relevant team members on status changes.

**Q7:** Should deliverables be attachable directly to tasks, or is work order-level sufficient?
**Answer:** Work order-level is sufficient for now - no need to attach deliverables directly to tasks.

**Q8:** Should file preview functionality be included for common file types?
**Answer:** Yes, add preview functionality for common file types including inline image previews, PDF viewer, and video player.

**Q9:** Any features to exclude or defer to future iterations?
**Answer:** No exclusions - implement the full feature.

### Existing Code to Reference

**Similar Features Identified:**

- **Deliverable Model:** `app/Models/Deliverable.php`
  - Already has status workflow (draft/in_review/approved/delivered via `DeliverableStatus` enum)
  - Has type field (`DeliverableType` enum: document, design, report, code, other)
  - Has simple version string field (will need version history table)
  - Has file_url field for file storage
  - Has acceptance_criteria (JSON array)
  - Polymorphic relationship to Documents via `documents()` method

- **Document Model:** `app/Models/Document.php`
  - Polymorphic model for file uploads (`documentable_type`, `documentable_id`)
  - Tracks: name, type, file_url, file_size, uploaded_by_id
  - `DocumentType` enum: reference, artifact, evidence, template

- **Deliverable Detail Page:** `resources/js/pages/work/deliverables/[id].tsx`
  - Existing detail page that will need enhancement for new features

- **Current File Upload:** Basic functionality exists with 10MB limit
  - Will need to increase to 50MB and add blocked file type validation

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - No visual files were found in the visuals folder.

## Requirements Summary

### Functional Requirements

**File Upload System:**
- Accept all file types except executables and dangerous files (e.g., .exe, .bat, .sh, .dll, .msi, .cmd, .com, .scr, .vbs, .js executables)
- Maximum file size: 50MB (increased from current 10MB)
- Store files on local filesystem (no S3 integration)
- Track file metadata: name, type, size, upload timestamp, uploaded by user

**Version History System:**
- Each file upload creates a new version record
- Version records include: version number, file reference, timestamp, uploader, optional notes
- Users can browse version history for a deliverable
- Users can restore/revert to previous versions
- Display version list with timestamps and notes
- No diff/comparison functionality required

**Status Workflow:**
- Maintain existing status workflow: Draft -> In Review -> Approved -> Delivered
- Any team member can change status (open permissions)
- Status changes trigger notifications to relevant team members (assignees, work order owner)
- Visual status indicators on deliverable cards and detail pages

**File Preview:**
- Inline image preview for common image formats (PNG, JPG, JPEG, GIF, SVG, WebP)
- PDF viewer for PDF documents
- Video player for common video formats (MP4, WebM, MOV)
- Graceful fallback for unsupported file types (download link)

**Deliverable Management:**
- Deliverables attached at work order level only (not task level)
- CRUD operations for deliverables
- Deliverable detail page with file management, version history, and status controls
- List view of deliverables within work order context

### Reusability Opportunities

**Existing Models to Extend:**
- `Deliverable` model - add relationship to new version history table
- `Document` model - may be reused or adapted for file uploads

**New Models Required:**
- `DeliverableVersion` model - for version history records

**Patterns to Follow:**
- Use existing polymorphic document pattern for file attachments
- Follow existing DeliverableStatus enum workflow
- Use existing team scoping pattern (`scopeForTeam`)
- Follow Inertia.js page patterns from existing `[id].tsx`

**Components to Potentially Build/Reuse:**
- File upload component with drag-and-drop
- Version history list component
- Status badge component (may exist)
- File preview components (image, PDF, video)

### Scope Boundaries

**In Scope:**
- File upload with 50MB limit and blocked file type validation
- Version history system with create/browse/restore capabilities
- Status workflow with open permissions and notifications
- File preview for images, PDFs, and videos
- Deliverable CRUD at work order level
- Deliverable detail page enhancements
- List view of deliverables

**Out of Scope:**
- S3/cloud storage integration (deferred)
- Task-level deliverable attachment
- Role-based status change permissions
- Version diff/comparison functionality
- Real-time collaboration on files
- External client access to deliverables
- Advanced document management features (folders, tagging)

### Technical Considerations

**Backend:**
- Create new `deliverable_versions` migration/model
- Update file upload validation rules (50MB, blocked extensions)
- Add version creation logic on file upload
- Add version restore functionality
- Implement status change notifications (Laravel notifications)
- Follow existing team scoping patterns

**Frontend (React/Inertia):**
- Enhance existing deliverable detail page (`resources/js/pages/work/deliverables/[id].tsx`)
- Build file upload component with progress indicator
- Build version history panel/modal
- Build file preview components
- Follow existing UI patterns (Radix UI, Tailwind CSS v4)
- Ensure dark mode support

**File Storage:**
- Store in local filesystem under appropriate storage directory
- Generate unique filenames to prevent collisions
- Track original filename for display

**Blocked File Extensions (dangerous/executable):**
- .exe, .bat, .cmd, .com, .msi, .dll, .scr
- .vbs, .vbe, .js (when executable), .jse, .ws, .wsf
- .ps1, .ps1xml, .psc1, .psd1, .psm1
- .sh, .bash, .zsh, .csh, .ksh
- .app, .dmg (macOS executables)
- .deb, .rpm (Linux packages)
- .jar (Java executables)

**Notifications:**
- Trigger on status change
- Notify: work order owner, assigned team members
- Use existing notification infrastructure if available
