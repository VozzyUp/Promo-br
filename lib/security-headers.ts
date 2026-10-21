// Cabeçalhos de segurança de todas as respostas. A CSP libera só o que o site usa: ele mesmo, imagens https e o AdSense.
const GOOGLE_ADS = [
  "https://pagead2.googlesyndication.com", "https://*.googlesyndication.com", "https://*.google.com", "https://*.doubleclick.net",
  "https://*.adtrafficquality.google", "https://*.googleadservices.com", "https://*.gstatic.com",
];

export function contentSecurityPolicy(dev: boolean): string {
  const ads = GOOGLE_ADS.join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${dev ? "'unsafe-eval' " : ""}${ads}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${ads}`,
    `frame-src ${ads}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders(opts: { dev: boolean; reportOnly: boolean }) {
  const list = [
    { key: opts.reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", value: contentSecurityPolicy(opts.dev) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
  if (!opts.dev) list.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
  return list;
}