import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { App } from './App';

test('renders the neutral shell without external services', () => {
  const html = renderToStaticMarkup(<App />);
  expect(html).toContain('<main>');
  expect(html).toContain('<h1>Afterimage</h1>');
});
