import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const githubPagesBasePath = '/habit-tracker';

const serviceWorkerScript = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const basePath = window.location.pathname.startsWith('${githubPagesBasePath}/')
      ? '${githubPagesBasePath}'
      : '';

    navigator.serviceWorker.register(basePath + '/sw.js', {
      scope: basePath + '/',
    }).catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#050505" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Habito" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href={`${githubPagesBasePath}/manifest.json`} />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href={`${githubPagesBasePath}/apple-touch-icon.png`}
        />
        <script dangerouslySetInnerHTML={{ __html: serviceWorkerScript }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
