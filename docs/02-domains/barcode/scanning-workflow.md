# Barcode Scanning Workflow

## Scanner Assumption

Barcode scanner behaves as keyboard input ending with Enter.

## POS Workflow

1. Focus is kept on scan input or global scanner listener.
2. User scans barcode.
3. System resolves barcode.
4. If roll barcode, select roll.
5. If product barcode, show roll selection.
6. If unknown barcode, show clear error.

## Rules

- Scan should not submit sale automatically.
- Unknown barcode should not create product automatically.
- Scanner input should be debounced safely.
