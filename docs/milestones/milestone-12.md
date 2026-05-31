Milestone 12: Settings and Admin Controls

Implement settings and admin controls.

Backend:
- Company settings
- Invoice settings
- Measurement settings
- Barcode settings
- Feature flags
- User management
- Role assignment

Frontend:
- Settings page
- Company profile form
- Invoice footer/settings form
- Measurement defaults form
- Barcode settings form
- User list
- Create/edit user
- Assign roles

Rules:
- Settings changes must create audit log.
- User role changes must create audit log.
- Only Admin can manage users and critical settings.
- Measurement conversion settings should not break historical records.
- Do not implement multi-branch settings beyond placeholders.

Acceptance criteria:
- Admin can update company details.
- Receipt uses company settings.
- Admin can create users.
- Admin can assign roles.
- Audit log records settings and role changes.