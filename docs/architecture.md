# AuthCore Architecture Overview

## 1. Muti-Tenancy Model

- Shared database
- Organization-scoped
- Tenant identified via org_id
- All protected routes require organization context

## 2. Authetication Model

- Short-lived access tokens (JWT)
- Long-lived refresh tokens
- Refresh token rotation
- Token reuse detection
- Hashed refresh token storage

## 3. Authorization Model

- Role-based access control per organization
- Roles stored in memberships
- Middleware-based permission enforcement

## 4. Data Consistency Strategy

- All critical multi-step flows wrapped in database transactions
- Soft delete instead of hard delete
- Foreign key constraints enforced
