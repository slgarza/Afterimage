/** Semantic chrome colors. Values are CSS hex colors, independent of any renderer. */
export interface ThemeTokens {
  readonly color: {
    readonly surface: {
      readonly canvas: `#${string}`;
      readonly panel: `#${string}`;
      readonly elevated: `#${string}`;
    };
    readonly text: {
      readonly primary: `#${string}`;
      readonly secondary: `#${string}`;
    };
    readonly border: {
      readonly subtle: `#${string}`;
      readonly control: `#${string}`;
    };
    readonly focus: {
      readonly ring: `#${string}`;
    };
  };
}

/** Charcoal surfaces with neutral-frost text and chrome; no gameplay meaning. */
export const theme = {
  color: {
    surface: {
      canvas: '#181a1b',
      panel: '#242729',
      elevated: '#303437',
    },
    text: {
      primary: '#f0f2f3',
      secondary: '#bec4c7',
    },
    border: {
      subtle: '#454b4f',
      control: '#899297',
    },
    focus: {
      ring: '#dce3e6',
    },
  },
} as const satisfies ThemeTokens;
