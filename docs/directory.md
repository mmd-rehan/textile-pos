project-root/
│
├── docs/
│
│   ├── 00-overview/
│   │   ├── project-vision.md
│   │   ├── business-overview.md
│   │   ├── terminology.md
│   │   ├── user-roles.md
│   │   ├── business-rules-global.md
│   │   └── success-metrics.md
│   │
│   ├── 01-architecture/
│   │   ├── system-architecture.md
│   │   ├── frontend-architecture.md
│   │   ├── backend-architecture.md
│   │   ├── database-architecture.md
│   │   ├── api-standards.md
│   │   ├── auth-authorization.md
│   │   ├── event-flow.md
│   │   ├── caching-strategy.md
│   │   ├── state-management.md
│   │   └── coding-standards.md
│   │
│   ├── 02-domains/
│   │
│   │   ├── inventory/
│   │   │   ├── overview.md
│   │   │   ├── business-rules.md
│   │   │   ├── workflows.md
│   │   │   ├── edge-cases.md
│   │   │   ├── database-schema.md
│   │   │   ├── api-contracts.md
│   │   │   ├── ui-behavior.md
│   │   │   ├── validation-rules.md
│   │   │   ├── permissions.md
│   │   │   ├── calculations.md
│   │   │   └── test-cases.md
│   │   │
│   │   ├── sales/
│   │   │   ├── overview.md
│   │   │   ├── retail-flow.md
│   │   │   ├── wholesale-flow.md
│   │   │   ├── pricing-rules.md
│   │   │   ├── invoice-rules.md
│   │   │   ├── discounts.md
│   │   │   ├── returns-refunds.md
│   │   │   ├── edge-cases.md
│   │   │   ├── api-contracts.md
│   │   │   ├── db-schema.md
│   │   │   └── test-cases.md
│   │   │
│   │   ├── customers/
│   │   │   ├── overview.md
│   │   │   ├── customer-types.md
│   │   │   ├── business-rules.md
│   │   │   ├── customer-ledger.md
│   │   │   ├── credit-rules.md
│   │   │   ├── pricing-tiers.md
│   │   │   ├── permissions.md
│   │   │   ├── workflows.md
│   │   │   ├── edge-cases.md
│   │   │   ├── api-contracts.md
│   │   │   ├── database-schema.md
│   │   │   ├── ui-behavior.md
│   │   │   ├── notifications.md
│   │   │   ├── validation-rules.md
│   │   │   └── test-cases.md
│   │   ├── purchases/
│   │   │   ├── overview.md
│   │   │   ├── supplier-management.md
│   │   │   ├── purchase-workflow.md
│   │   │   ├── roll-entry-rules.md
│   │   │   ├── batch-management.md
│   │   │   ├── cost-calculations.md
│   │   │   ├── landed-cost.md
│   │   │   ├── returns.md
│   │   │   ├── edge-cases.md
│   │   │   ├── api-contracts.md
│   │   │   ├── database-schema.md
│   │   │   ├── ui-behavior.md
│   │   │   ├── permissions.md
│   │   │   ├── validation-rules.md
│   │   │   └── test-cases.md
│   │   ├── accounting/
│   │   │   ├── overview.md
│   │   │   ├── chart-of-accounts.md
│   │   │   ├── ledger-system.md
│   │   │   ├── journal-entries.md
│   │   │   ├── invoice-accounting.md
│   │   │   ├── customer-payments.md
│   │   │   ├── supplier-payments.md
│   │   │   ├── expense-management.md
│   │   │   ├── cash-management.md
│   │   │   ├── bank-management.md
│   │   │   ├── profit-loss.md
│   │   │   ├── taxation.md
│   │   │   ├── reconciliation.md
│   │   │   ├── audit-rules.md
│   │   │   ├── edge-cases.md
│   │   │   ├── api-contracts.md
│   │   │   ├── database-schema.md
│   │   │   ├── permissions.md
│   │   │   └── test-cases.md
│   │   ├── reports/
│   │   │   ├── overview.md
│   │   │   ├── inventory-reports.md
│   │   │   ├── sales-reports.md
│   │   │   ├── wholesale-reports.md
│   │   │   ├── customer-reports.md
│   │   │   ├── accounting-reports.md
│   │   │   ├── wastage-reports.md
│   │   │   ├── remnant-reports.md
│   │   │   ├── profitability-reports.md
│   │   │   ├── dashboard-metrics.md
│   │   │   ├── export-rules.md
│   │   │   ├── filtering-rules.md
│   │   │   ├── permissions.md
│   │   │   ├── edge-cases.md
│   │   │   ├── api-contracts.md
│   │   │   ├── ui-behavior.md
│   │   │   └── test-cases.md
│   │   ├── barcode/
│   │   │   ├── overview.md
│   │   │   ├── barcode-types.md
│   │   │   ├── roll-barcodes.md
│   │   │   ├── product-barcodes.md
│   │   │   ├── printing-rules.md
│   │   │   ├── scanning-workflow.md
│   │   │   ├── barcode-format.md
│   │   │   ├── label-design.md
│   │   │   ├── hardware-support.md
│   │   │   ├── edge-cases.md
│   │   │   ├── api-contracts.md
│   │   │   ├── ui-behavior.md
│   │   │   ├── permissions.md
│   │   │   └── test-cases.md
│   │   ├── authentication/
│   │   │   ├── overview.md
│   │   │   ├── auth-flow.md
│   │   │   ├── user-roles.md
│   │   │   ├── permissions-matrix.md
│   │   │   ├── session-management.md
│   │   │   ├── token-strategy.md
│   │   │   ├── password-policy.md
│   │   │   ├── multi-branch-access.md
│   │   │   ├── audit-logging.md
│   │   │   ├── activity-tracking.md
│   │   │   ├── security-rules.md
│   │   │   ├── edge-cases.md
│   │   │   ├── api-contracts.md
│   │   │   ├── database-schema.md
│   │   │   ├── ui-behavior.md
│   │   │   └── test-cases.md
│   │   └── settings/
│   │   │   ├── overview.md
│   │   │   ├── company-settings.md
│   │   │   ├── branch-settings.md
│   │   │   ├── invoice-settings.md
│   │   │   ├── inventory-settings.md
│   │   │   ├── pricing-settings.md
│   │   │   ├── taxation-settings.md
│   │   │   ├── barcode-settings.md
│   │   │   ├── measurement-settings.md
│   │   │   ├── notification-settings.md
│   │   │   ├── backup-settings.md
│   │   │   ├── localization.md
│   │   │   ├── integrations.md
│   │   │   ├── feature-flags.md
│   │   │   ├── permissions.md
│   │   │   ├── edge-cases.md
│   │   │   ├── api-contracts.md
│   │   │   ├── ui-behavior.md
│   │   │   └── test-cases.md
│   │
│   ├── 03-database/
│   │   ├── erd.md
│   │   ├── naming-conventions.md
│   │   ├── migration-strategy.md
│   │   ├── indexing-strategy.md
│   │   ├── audit-log-strategy.md
│   │   └── multi-tenant-strategy.md
│   │
│   ├── 04-api/
│   │   ├── rest-guidelines.md
│   │   ├── error-format.md
│   │   ├── pagination.md
│   │   ├── filtering-sorting.md
│   │   ├── authentication.md
│   │   └── websocket-events.md
│   │
│   ├── 05-ui-ux/
│   │   ├── design-system.md
│   │   ├── color-system.md
│   │   ├── typography.md
│   │   ├── responsive-rules.md
│   │   ├── form-standards.md
│   │   ├── table-standards.md
│   │   ├── modal-patterns.md
│   │   └── loading-error-states.md
│   │
│   ├── 06-ai/
│   │   ├── project-context.md
│   │   ├── ai-instructions.md
│   │   ├── frontend-generation-rules.md
│   │   ├── backend-generation-rules.md
│   │   ├── database-generation-rules.md
│   │   ├── refactoring-rules.md
│   │   ├── bugfix-rules.md
│   │   └── prompt-templates/
│   │       ├── feature-template.md
│   │       ├── backend-template.md
│   │       ├── frontend-template.md
│   │       ├── db-template.md
│   │       └── debugging-template.md
│   │
│   ├── 07-decisions/
│   │   ├── ADR-001-tech-stack.md
│   │   ├── ADR-002-inventory-engine.md
│   │   ├── ADR-003-auth-system.md
│   │   ├── ADR-004-state-management.md
│   │   └── ADR-005-multi-branch-strategy.md
│   │
│   ├── 08-testing/
│   │   ├── testing-strategy.md
│   │   ├── unit-testing.md
│   │   ├── integration-testing.md
│   │   ├── e2e-testing.md
│   │   └── textile-edge-case-tests.md
│   │
│   └── 09-devops/
│       ├── deployment.md
│       ├── ci-cd.md
│       ├── docker.md
│       ├── environments.md
│       └── monitoring.md
│
├── frontend/
├── backend/
├── shared/
├── scripts/
├── docker/
├── .cursor/rules/
├── README.md
└── package.json