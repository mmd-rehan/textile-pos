# Barcode API Contracts

## Candidate Endpoints

- `GET /barcodes/resolve/:code`
- `POST /barcodes/generate/roll/:rollId`
- `POST /barcodes/generate/product/:productId`
- `GET /barcodes/labels/roll/:rollId`
- `GET /barcodes/labels/product/:productId`

## Required Behavior

- Resolve endpoint returns record type and relevant display data.
- Generate endpoint must prevent duplicates.
- Label endpoint returns printable label data or generated image/PDF pending implementation.
