# Design Document: Serial Number Edit, Delete, and Super Admin Audit Trail

## 1. Intent & Purpose
Enable authorized tenant managers and admins to edit (correct typos, material codes, dealer codes, statuses) or delete mistakenly uploaded serial numbers in the CRM. Guarantee full auditability by recording an append-only log of who performed the action, exact timestamp, and the before/after state diff. Restrict visibility of this audit log exclusively to Super Admins.

## 2. Constraints & Non-Goals
- **Zero Impact on Existing Tenant Data:** Existing serial numbers, products, orders, and company records remain completely untouched.
- **No Live Docker / Production Disruption:** All work is committed as standard application code updates for subsequent deployment without touching running live containers.
- **Tenant Isolation:** Tenant users can only edit or delete serial numbers belonging strictly to their own `companyId`.
- **Append-Only Immutability:** Audit events are created using `AuditEvent` (which has mongoose pre-save hooks preventing updates or deletion of audit logs).
- **Strict Super Admin Exclusivity:** The endpoint to read serial audit events is protected by `auth` and `superAdminOnly` middleware.

## 3. Approaches Considered & Selected
- **Approach 1 (Selected):** Targeted Single-Unit Edit & Delete with Super Admin Audit Table. Direct, surgical, zero regression risk.
- **Approach 2 (Rejected for now):** Batch Rollback of whole CSV imports. Excluded to keep the update minimal and targeted as requested.

## 4. Architecture & Technical Specification

### A. Backend API Changes
1. **Edit Serial (`PUT /api/v1/serial-registry/:id`)**:
   - Middleware: `auth`, `requirePermission('inventory.edit')` (or tenant admin/manager check).
   - Validates that the serial exists and belongs to `req.user.companyId` (or user is superAdmin).
   - Updates editable fields: `serialNumber`, `materialCode`, `dealerCode`, `status`, `customer`, `batchNumber`.
   - Records an `AuditEvent`:
     - `action: 'serial.edit'`
     - `entity: 'SerialRegistry'`
     - `entityId: serial._id`
     - `actorId: req.user.id`, `actorRole: req.user.role`
     - `previousValue`: previous snapshot of changed fields
     - `newValue`: updated snapshot of fields
     - `metadata`: `{ companyId, materialCode, serialNumber }`

2. **Delete Serial (`DELETE /api/v1/serial-registry/:id`)**:
   - Middleware: `auth`, `requirePermission('inventory.delete')` (or tenant admin/manager check).
   - Scoped strictly to `companyId`.
   - Records an `AuditEvent`:
     - `action: 'serial.delete'`
     - `entity: 'SerialRegistry'`
     - `entityId: serial._id`
     - `actorId: req.user.id`, `actorRole: req.user.role`
     - `previousValue`: full document snapshot before deletion
     - `newValue`: null
     - `metadata`: `{ companyId, materialCode, serialNumber, deletedAt: new Date() }`
   - Executes `SerialRegistry.deleteOne({ _id, companyId })`.

3. **Super Admin Audit Viewer API (`GET /api/tenant-control/audit-logs`)**:
   - Middleware: `auth`, `superAdminOnly`.
   - Queries `AuditEvent.find({ entity: 'SerialRegistry' })` sorted by `createdAt: -1`.
   - Populates actor details (`actorId`: name, email, role).
   - Returns paginated list with filter by company or action (`serial.edit`, `serial.delete`).

### B. Frontend Interfaces
1. **Tenant Serial Management (`public/serial-validation.html` & React `SerialValidation.jsx`)**:
   - Add a "Registered Serials Registry" panel/tab.
   - Lists units with search by Serial Number, Material Code, Dealer Code.
   - Actions per row:
     - **Edit button**: Opens a clean modal to update Material Code, Dealer Code, or Status.
     - **Delete button**: Triggers confirmation dialog ("Delete this mistakenly uploaded serial? This action is logged for Super Admin review.") then calls `DELETE`.
2. **Super Admin Portal (`public/super-admin.html`)**:
   - Add an **"Audit Logs"** navigation item and view.
   - Displays a table of all serial number modifications and deletions across all tenants:
     - Timestamp
     - Actor (Name & Email)
     - Company Name / ID
     - Action (`EDIT` or `DELETE`)
     - Details (What fields were modified: Before vs After)

## 5. Verification Plan
- Automated backend unit/integration tests verifying:
  - Editing a serial updates the DB and records an `AuditEvent`.
  - Deleting a serial removes the document and records an `AuditEvent`.
  - Tenant boundary enforcement (Tenant A cannot edit/delete Tenant B's serial).
  - Super Admin audit endpoint returns the events and rejects non-super-admins with 403 Forbidden.

