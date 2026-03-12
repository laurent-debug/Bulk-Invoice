import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // Replace with your actual deployed URL
  const baseUrl = 'https://bulkinvoice.app';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/'], // /dashboard/ doesn't exist yet but good practice
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
