# CLAUDE.md

## TypeScript conventions

- Always use `type` instead of `interface` for type definitions.
- Use `const` arrow functions instead of `function` declarations (e.g. `const foo = () => {}`).
- Use `export const` directly instead of a separate `export { name }` statement.

## React conventions

- Never use `React` as a namespace/global. Import individual types and functions explicitly (e.g. `import type { CSSProperties } from 'react'`).
- Use `Props` for component prop types (not `ComponentNameProps`) — the file name provides context.
- Use Tailwind CSS for all styling. No inline styles or CSS-in-JS.
- Use shadcn components whenever applicable. Do not invent custom components if shadcn offers a ready-made component for the case.
- Keep JSX return blocks clean — no `if`/`switch` statements inside the returned JSX. Mappings (`.map`) and `&&` conditionals are fine. If branching logic is needed, extract it to a separate sub-component or helper function.
- Extract reusable or repeated JSX blocks into their own components (can be in the same file as non-exported sub-components).
- Define sub-components **before** the main exported component — treat them like non-hoisted functions where anything referenced must be introduced first. No separator comments needed.
- Never use inline SVG elements in components - always use lucide-icons.

## Localization

- Add all new customer-facing strings to localization resources instead of hard-coding them inline. This includes visible UI copy, aria labels, placeholders, titles, and toast messages.

## Quality checks

- Always run `cd server && npm run typecheck` before reporting a task done when changing code under `server/`, server tests, or shared server types. All server type errors must be resolved.
- Always run `cd client && ./node_modules/.bin/tsc --noEmit` before reporting a task done. All type errors must be resolved.
- Always run `cd client && npm run lint` before reporting a task done. All lint errors must be resolved.
- Always run `cd client && npm test` before reporting a task done. All tests must pass.
- When changing code in the tested scope (`src/client/`, `src/server/`), add or update the corresponding tests in the colocated `__tests__/` directory. Tests use Vitest.

## Test fixtures

- Prefer shared server test factories over handwritten object literals for exported server types such as `SerializedProject`, `Ticket`, `ChatSession`, and `MobileBundleDetails`. When a required field is added to a shared type, update the relevant factory helpers in the same change.

## Code style

- Never put `if` bodies on the same line as the condition. Always use braces and put the body on its own line:

    ```ts
    // correct
    if (condition) {
        return
    }

    // wrong — single-line body
    if (condition) {
        return
    }
    if (condition) return
    ```

- Use `&&` for conditional rendering, not ternary-to-null: `condition && <Jsx />`, not `condition ? <Jsx /> : null`.

