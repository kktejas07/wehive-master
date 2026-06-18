# React Patterns (CRA)

Adapted from Nuxt/Vue patterns for this React CRA codebase.

## Data Fetching

```jsx
// PREFERRED: use axios with AuthContext (consistent error handling)
import { API } from '../context/AuthContext';

// AVOID: inline fetch in every component
// PREFERRED: extract into custom hooks
```

## Lazy Loading

```jsx
// PREFERRED: React.lazy + Suspense
const UniversityDetail = lazy(() => import('../pages/UniversityDetail'));

// AVOID: importing all pages eagerly
```

## Performance Checklist

- [ ] Lists use `key` prop correctly (stable, unique IDs)
- [ ] No `inline` arrow functions in render props (use `useCallback`)
- [ ] Expensive computations wrapped in `useMemo`
- [ ] React.lazy for route-level code splitting
- [ ] No direct state mutations (use spread/immutable patterns)
- [ ] API calls batched with `Promise.all` where independent
