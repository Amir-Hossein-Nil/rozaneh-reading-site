export default function config(phase) {
  return {
    basePath: '/app',
    distDir: phase === 'phase-development-server' ? '.next-dev' : '.next',
    transpilePackages: ['@site/ui', '@site/contracts', '@site/content'],
    poweredByHeader: false,
    devIndicators: false,
    logging: { incomingRequests: { ignore: [/\/auth\/callback/] } },
    serverExternalPackages: ['@electric-sql/pglite', '@huggingface/transformers'],
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'Cache-Control', value: 'private, no-store' },
            { key: 'X-Robots-Tag', value: 'noindex' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            {
              key: 'Content-Security-Policy',
              value:
                "default-src 'self'; script-src 'self' 'unsafe-inline'" +
                (phase === 'phase-development-server' ? " 'unsafe-eval'" : '') +
                "; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
            },
          ],
        },
      ];
    },
  };
}
