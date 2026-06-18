# MongoDB Patterns

Adapted from PostgreSQL patterns for this codebase (Motor + MongoDB).

## Index Cheat Sheet (see `db.py:33-71`)

| Query Pattern | Index Type | Example in Code |
|--------------|------------|-----------------|
| `WHERE field = value` | Single field | `users.create_index('email', unique=True)` |
| `WHERE a = x AND b > y` | Compound | `scans.create_index([('user_id', 1), ('created_at', -1)])` |
| Text search | Text index | `universities_col.create_index([('name', 'text'), ('short_name', 'text')])` |
| TTL expiry | TTL index | `otps.create_index('expires_at', expireAfterSeconds=0)` |

## Schema Design

| Use Case | MongoDB Type | Notes |
|----------|-------------|-------|
| IDs | `ObjectId` / `str` | Stored as `_id`, serialized to `id` |
| Strings | `str` | Index with `sparse=True` for optional fields |
| Timestamps | `datetime` | UTC, indexed with descending sort |
| Money | `int` (paise) or `float` | Stored in INR/USD |
| Booleans | `bool` | Used for `is_premium`, `active` flags |

## Common Patterns

**Compound index order:** equality first, then sort/range:
```python
# GOOD: filter then sort
await scans.create_index([('user_id', 1), ('created_at', -1)])

# AVOID: sort-only index if also filtering
```

**Partial / Sparse indexes:**
```python
# Only index documents where field exists
await users.create_index('phone', unique=True, sparse=True)
```

**TTL indexes for auto-expiry:**
```python
# Documents auto-delete after expiry
await otps.create_index('expires_at', expireAfterSeconds=0)
```

## Anti-Patterns

- **N+1 queries**: Fetching docs then looping to fetch related data. Use aggregation `$lookup` or batch fetch instead.
- **Missing indexes on sort fields**: `created_at` should be indexed in any collection sorted by date.
- **Over-indexing**: Each index consumes RAM. Remove unused indexes in production.
- **No `await` on writes**: Motor is async — missing `await` silently drops writes.

## Key Collections

| Collection | Primary Index | Purpose |
|-----------|--------------|---------|
| `users` | `email` (unique), `phone` (sparse) | User accounts |
| `applications` | `user_id` | Visa applications |
| `scans` | `user_id` + `created_at` | Document scans |
| `universities_v2` | `country` + `rank` | University catalog |
| `payments` | `user_id` | Payment records |
