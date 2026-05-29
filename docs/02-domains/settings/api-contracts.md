# Settings API Contracts

## Candidate Endpoints

- `GET /settings`
- `PATCH /settings/company`
- `PATCH /settings/invoice`
- `PATCH /settings/inventory`
- `PATCH /settings/pricing`
- `PATCH /settings/taxation`
- `PATCH /settings/barcode`
- `PATCH /settings/measurement`
- `GET /settings/audit-log`

## Required Behavior

- Settings writes require permission.
- Sensitive settings changes must be audited.
- Backend must validate setting values.
