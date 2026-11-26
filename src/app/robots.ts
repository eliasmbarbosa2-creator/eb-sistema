import type { MetadataRoute } from 'next';

// A área administrativa não é citada aqui de propósito: citar o caminho revelaria que ela existe.
// Ela fica fora do Google pelo cabeçalho "noindex" definido em next.config.ts.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/' }] };
}
