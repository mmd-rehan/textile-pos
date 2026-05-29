# Barcode Format

## Current Status

Exact barcode format is pending confirmation.

## Recommended Pattern

Use a short, stable, non-sensitive code:

```text
R-{sequence}
P-{sequence}
```

Examples:

```text
R-1001
P-00045
```

## Rules

- Do not encode prices as the source of truth.
- Do not encode sensitive information.
- Barcode value should map to database record.

## Pending Confirmation

- Final prefix and sequence format.
- Whether existing manual barcodes need importing.
