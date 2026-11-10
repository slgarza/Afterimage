# UI theme tokens

P06 exposes reusable charcoal and neutral-frost chrome colors only. There are no
runtime dependencies, application imports, assets, components, or game semantics.
The product docs specify no exact palette values; the values here implement the
ticket's color direction rather than an external visual identity.

```ts
import { theme } from '@afterimage/ui';
import type { ThemeTokens } from '@afterimage/ui';

const colors: ThemeTokens['color'] = theme.color;
const panelStyle = {
  backgroundColor: colors.surface.panel,
  color: colors.text.primary,
  borderColor: colors.border.subtle,
};
```

The public API is `theme` and `ThemeTokens`. Tokens are readonly in TypeScript,
with semantic names and CSS hex values. Build the package before consuming its
JavaScript and declaration exports. Consumers can use the values in any renderer
that accepts CSS hex colors; no React or browser API is required.

Use `border.subtle` for decorative separators, `border.control` for control
boundaries, and `focus.ring` for focus indicators. Both text colors meet a 4.5:1
contrast ratio on all supplied surfaces; control boundaries and focus rings meet
3:1. Component layout, focus handling, and accessibility remain the consumer's
responsibility.

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` with
`--workspace @afterimage/ui` from the repository root.
