Milestone 4: Product Catalog and Units

Implement product catalog and measurement settings.

Backend modules:
- products
- categories
- brands
- batches
- units
- settings

Backend APIs:
- CRUD categories
- CRUD brands
- CRUD products
- CRUD product colors
- CRUD product designs
- CRUD units if admin only
- List unit conversions
- CRUD batches or create batch linked to product and supplier later

Product fields:
- productCode
- name
- productType: FABRIC_ROLL, CUT_PIECE, FIXED_PRODUCT
- categoryId
- brandId optional
- colorId optional
- designId optional
- defaultUnitId
- retailPrice
- wholesalePrice
- status

Frontend:
- Product list page
- Product create/edit form
- Category management page
- Brand management page
- Basic batch list page
- Use React Hook Form and Zod
- Use TanStack Query for server state
- Use server-side pagination for product list

Rules:
- Do not create roll stock yet.
- Do not deduct inventory.
- Backend validation is required.
- Money and measurement values must stay decimal-safe.

Acceptance criteria:
- Admin can create categories, brands, and products.
- Product list supports search, pagination, and status filter.
- Product type is required.
- Product code is unique.
- Unit conversion data exists.