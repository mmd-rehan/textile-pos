# Purchase API Contracts

## Candidate Endpoints

- `GET /suppliers`
- `POST /suppliers`
- `PATCH /suppliers/:id`
- `GET /purchases`
- `POST /purchases`
- `GET /purchases/:id`
- `POST /purchases/:id/cancel`
- `POST /purchases/:id/returns`

## Required Behavior

- Purchase creation must be transactional.
- Roll creation and inventory movement creation must commit with purchase.
- Supplier ledger entry must be created if purchase affects payable balance.
