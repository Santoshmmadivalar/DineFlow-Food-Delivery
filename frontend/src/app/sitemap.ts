import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ['' /* This is equivalent to / */]

  return routes.map(route => ({
    url: `${process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://frontend-xi-three-68.vercel.app' : 'http://localhost:3000')}${route}`
  }))
}
