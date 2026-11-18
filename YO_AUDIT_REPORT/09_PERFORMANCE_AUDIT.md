# 09 — Performance & Resource Utilization Audit

## 1. Measured Benchmarks & Build Profile

| Metric | Measured Value | Standard Target | Assessment |
| :--- | :--- | :--- | :--- |
| **Vite Production Build Time** | `1.76s` | `< 5.0s` | Optimal |
| **Transformed Modules** | `2,609 modules` | — | Expected for React 19 + Lucide + Motion |
| **Main JS Bundle Chunk** | `858.96 kB` (`240.12 kB` gzip) | `< 500 kB` | **Needs Chunk Splitting** |
| **CSS Bundle Size** | `86.05 kB` (`13.02 kB` gzip) | `< 100 kB` | Optimal (Tailwind v4 zero-runtime) |
| **Vitest Test Suite Run Time** | `2.11s` (22 tests) | `< 5.0s` | Optimal |

---

## 2. Code-Based Performance Bottlenecks

1. **Large Component Render Tree (`YoApp.tsx`)**:
   - The root component re-renders whenever state changes across tab navigation, active call signaling, avatar preview drawers, or incoming messages.
   - *Fix*: Extract sub-components and wrap list items in `React.memo`.

2. **Full Message DOM Materialization**:
   - In conversations with hundreds of messages, all message bubbles and media elements are rendered into the DOM simultaneously without virtual windowing.
   - *Fix*: Integrate `@tanstack/react-virtual` to keep only the visible viewport (+/- 10 items) in the active DOM tree.

3. **N+1 Serial Profile Queries**:
   - `refreshConversations()` iterates through conversation rows and sequentially awaits `supabase.from('profiles').select('*')`.
   - *Fix*: Replace with a single query using an `IN` filter or join on the foreign key relation.
