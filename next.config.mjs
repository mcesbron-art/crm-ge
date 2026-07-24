/** @type {import('next').NextConfig} */

/**
 * Headers de sécurité appliqués sur TOUTES les routes.
 * Cf. https://owasp.org/www-project-secure-headers/
 */
const securityHeaders = [
  // HSTS — force HTTPS pendant 2 ans (à activer après mise en prod sous HTTPS)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },

  // Bloque le sniffing de type MIME
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Bloque l'embedding dans des iframes externes (anti-clickjacking)
  // Pour autoriser /sign/* à être embedé : utiliser frame-ancestors dans CSP à la place
  { key: "X-Frame-Options", value: "SAMEORIGIN" },

  // Politique referrer minimaliste
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Désactive les API navigateurs sensibles non utilisées
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },

  // Content-Security-Policy : restreint sources de scripts/styles/images
  // Note : 'unsafe-inline' style nécessaire pour les styles inline React (style={{...}})
  // 'unsafe-eval' nécessaire pour Next.js dev mode — à retirer en production stricte si possible
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://axonaut.com",
      "frame-src 'self' blob: data:",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },

  // Redirect racine → dashboard au niveau HTTP (évite le redirect RSC qui cause React #310)
  async redirects() {
    return [
      { source: "/", destination: "/dashboard", permanent: false },
    ];
  },

  // Headers globaux (sécurité)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Optimisations production
  poweredByHeader: false, // retire le header X-Powered-By: Next.js (info-leak)
  compress: true,

  // Pour les images externes éventuelles (logos clients via Axonaut, etc.)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "axonaut.com" },
    ],
  },
};

export default nextConfig;
