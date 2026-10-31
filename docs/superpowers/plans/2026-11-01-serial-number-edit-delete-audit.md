# Serial Number Edit, Delete, and Super Admin Audit Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide authorized tenant managers the ability to edit or delete mistakenly uploaded serial numbers with complete audit trail logging, strictly viewable only by Super Admins, with zero impact on active tenant data.

**Architecture:** 
1. Expose tenant-scoped `PUT /api/v1/serial-registry/:id` and `DELETE /api/v1/serial-registry/:id` endpoints in `routes/serialRegistry.js`, recording append-only `AuditEvent` records via `services/auditService.js`.
2. Expose `GET /api/tenant-control/audit-logs` in `routes/tenantControl.js` strictly guarded by `superAdminOnly` to query and return serial audit records.
3. Update `public/serial-validation.html` to allow searching, editing, and deleting serial numbers with user confirmation.
4. Update `public/super-admin.html` with an Audit Logs viewer tab to display timestamps, actors, actions, and before/after diffs.

**Tech Stack:** Node.js, Express, MongoDB (Mongoose), Vanilla JS / Tailwind / CSS in public HTML templates.

**Spec:** `docs/superpowers/specs/2026-10-31-serial-number-edit-delete-audit-design.md`

## Global Constraints

- Never delete, truncate, or alter existing active tenant data during development, testing, or deployment.
- Tenant isolation: All edit and delete operations must strictly filter by `companyId`.
- Audit logs are immutable and append-only using the existing `AuditEvent` schema.
- Non-super-admins must receive `403 Forbidden` when attempting to access the audit logs endpoint.
- No modifications to live Docker containers or live running production environments.

## Review Focus

1. **Attempting to edit or delete another tenant's serial:** Must return `404 Not Found` (tenant scoping).
2. **Non-super-admin accessing `/api/tenant-control/audit-logs`:** Must return `403 Forbidden`.
3. **Modifying a serial with invalid/empty fields:** Must return `400 Bad Request` with an appropriate error message.
4. **Deleting a serial:** Must cleanly remove the single document from `SerialRegistry` and create an audit log with the previous document snapshot.
5. **Editing a serial:** Must update only the specified fields, leaving other properties intact, and record previous vs new values in `AuditEvent`.

---

### Task 1: Backend Serial Edit & Delete APIs with Audit Trail

**Files:**
- Modify: `Iconic-Smart-CRM-main/routes/serialRegistry.js`
- Test: `Iconic-Smart-CRM-main/scratch/test-serial-edit-delete-audit.js`

**Interfaces:**
- Consumes: `models/SerialRegistry.js`, `services/auditService.js` (`recordAuditEvent`), `middleware/auth.js`, `middleware/rbac.js`.
- Produces: 
  - `PUT /api/v1/serial-registry/:id`
  - `DELETE /api/v1/serial-registry/:id`

- [ ] **Step 1: Write the failing test for Serial Edit and Delete endpoints**
Create `scratch/test-serial-edit-delete-audit.js` asserting that `PUT /api/v1/serial-registry/:id` updates fields and records an audit log, and `DELETE /api/v1/serial-registry/:id` deletes only the target document and records an audit log.

- [ ] **Step 2: Run test to verify it fails**
Run: `node Iconic-Smart-CRM-main/scratch/test-serial-edit-delete-audit.js`
Expected: FAIL (404 Not Found on PUT/DELETE endpoints).

- [ ] **Step 3: Implement `PUT /api/v1/serial-registry/:id` and `DELETE /api/v1/serial-registry/:id` in `routes/serialRegistry.js`**
- Check authentication and `companyId`.
- Find unit strictly matching `{ _id: req.params.id, companyId: req.user.companyId }`.
- For `PUT`: update allowed fields (`serialNumber`, `materialCode`, `dealerCode`, `status`, `customer`, `batchNumber`), save, and call `recordAuditEvent` with `action: 'serial.edit'`.
- For `DELETE`: snapshot previous state, call `SerialRegistry.deleteOne({ _id: req.params.id, companyId: req.user.companyId })`, and call `recordAuditEvent` with `action: 'serial.delete'`.

- [ ] **Step 4: Run test to verify it passes**
Run: `node Iconic-Smart-CRM-main/scratch/test-serial-edit-delete-audit.js`
Expected: PASS for Task 1 tests.

- [ ] **Step 5: Commit changes**
```bash
git add Iconic-Smart-CRM-main/routes/serialRegistry.js Iconic-Smart-CRM-main/scratch/test-serial-edit-delete-audit.js
git commit -m "feat(serial-registry): add PUT and DELETE endpoints with audit logging"
```

---

### Task 2: Super Admin Audit Log Retrieval API

**Files:**
- Modify: `Iconic-Smart-CRM-main/routes/tenantControl.js`
- Test: `Iconic-Smart-CRM-main/scratch/test-serial-edit-delete-audit.js`

**Interfaces:**
- Consumes: `models/AuditEvent.js`, `middleware/auth.js`, `middleware/rbac.js` (`superAdminOnly`).
- Produces: `GET /api/tenant-control/audit-logs`

- [ ] **Step 1: Write test asserting audit log endpoint security and retrieval**
Add tests in `scratch/test-serial-edit-delete-audit.js` checking that:
- Non-super-admin calling `GET /api/tenant-control/audit-logs` gets `403 Forbidden`.
- Super-admin calling `GET /api/tenant-control/audit-logs` receives the list of `serial.edit` and `serial.delete` audit events populated with actor name and email.

- [ ] **Step 2: Run test to verify it fails**
Run: `node Iconic-Smart-CRM-main/scratch/test-serial-edit-delete-audit.js`
Expected: FAIL (endpoint not yet implemented).

- [ ] **Step 3: Implement `GET /api/tenant-control/audit-logs` in `routes/tenantControl.js`**
- Add route `router.get('/audit-logs', auth, superAdminOnly, async (req, res) => ...)`
- Query `AuditEvent.find({ entity: 'SerialRegistry' })` sorted by `createdAt: -1`.
- Populate `actorId` with `name email role`.
- Support query params: `page`, `limit`, `action`, `companyId`.
- Return paginated results.

- [ ] **Step 4: Run test to verify it passes**
Run: `node Iconic-Smart-CRM-main/scratch/test-serial-edit-delete-audit.js`
Expected: PASS for Task 2 tests.

- [ ] **Step 5: Commit changes**
```bash
git add Iconic-Smart-CRM-main/routes/tenantControl.js Iconic-Smart-CRM-main/scratch/test-serial-edit-delete-audit.js
git commit -m "feat(tenant-control): add super admin audit logs retrieval endpoint"
```

---

### Task 3: Tenant UI for Managing, Editing, and Deleting Uploaded Serials

**Files:**
- Modify: `Iconic-Smart-CRM-main/public/serial-validation.html`
- Optional: `Iconic-Smart-CRM-main/client/src/pages/SerialValidation.jsx`

**Interfaces:**
- Consumes: `GET /api/v1/serial-registry/units`, `PUT /api/v1/serial-registry/:id`, `DELETE /api/v1/serial-registry/:id`.
- Produces: User-facing interactive registry table with Edit modal and Delete confirmation.

- [ ] **Step 1: Add Registered Units Section to `public/serial-validation.html`**
- Add table listing uploaded serials with columns: Serial Number, Material Code, Dealer Code, Status, Customer, Created At, Actions.
- Add Search input by serial number, material code, or dealer code.

- [ ] **Step 2: Implement Edit Modal in `public/serial-validation.html`**
- Clicking "Edit" opens a clean modal pre-filled with the serial's current details.
- Submitting calls `PUT /api/v1/serial-registry/:id`.
- On success: displays success notification, closes modal, and refreshes the table.

- [ ] **Step 3: Implement Delete Action in `public/serial-validation.html`**
- Clicking "Delete" opens a confirmation prompt explaining that the mistaken upload will be deleted and logged for Super Admin review.
- On confirmation, calls `DELETE /api/v1/serial-registry/:id`.
- On success: displays success notification and refreshes the table.

- [ ] **Step 4: Verify UI behavior in browser / script**
Verify that the table correctly lists units, handles edits, and deletes without error.

- [ ] **Step 5: Commit changes**
```bash
git add Iconic-Smart-CRM-main/public/serial-validation.html
git commit -m "feat(ui): add registered serials table with edit modal and delete confirmation"
```

---

### Task 4: Super Admin UI for Viewing Audit Logs

**Files:**
- Modify: `Iconic-Smart-CRM-main/public/super-admin.html`

**Interfaces:**
- Consumes: `GET /api/tenant-control/audit-logs`.
- Produces: Super admin audit table with timestamps, actors, actions, companies, and diffs.

- [ ] **Step 1: Add "Audit Logs" to navigation in `public/super-admin.html`**
- Add navigation item for Audit Logs in the sidebar/tabs.

- [ ] **Step 2: Add Audit Logs View Panel in `public/super-admin.html`**
- Create table with columns: Timestamp, Actor (Name & Email), Action (EDIT / DELETE badge), Company, Serial Number, Change Summary.
- Include a "View Details" collapsible/modal showing before vs after state diff.

- [ ] **Step 3: Connect Frontend JavaScript to `GET /api/tenant-control/audit-logs`**
- Fetch audit logs on tab activation.
- Render rows dynamically with formatted timestamps and status badges.

- [ ] **Step 4: Commit changes**
```bash
git add Iconic-Smart-CRM-main/public/super-admin.html
git commit -m "feat(super-admin): add audit logs table viewing serial edits and deletes"
```

---

### Task 5: End-to-End Verification & Safety Confirmation

**Files:**
- Test: `Iconic-Smart-CRM-main/scratch/test-serial-edit-delete-audit.js`

- [ ] **Step 1: Run comprehensive automated test suite**
Run: `node Iconic-Smart-CRM-main/scratch/test-serial-edit-delete-audit.js`
Expected: ALL test cases PASS:
  - Create serial in test company
  - Edit serial -> verifies DB updated & audit event created with exact diff
  - Delete serial -> verifies DB record deleted & audit event created with snapshot
  - Non-super-admin attempt to read audit logs returns 403
  - Super-admin read audit logs returns the recorded audit events
  - Cross-tenant edit/delete attempt returns 404
  - Verification that NO other company's records were modified or deleted.

- [ ] **Step 2: Final git status check and hygiene**
Verify git working tree is clean and only the expected files are staged/committed.

