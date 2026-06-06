import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'Wallo',
    short_name:       'Wallo',
    description:      'Wall Painting Job Management',
    start_url:        '/',
    display:          'standalone',
    background_color: '#ffffff',
    theme_color:      '#1e3a5f',
    icons: [
      { src: '/app-icon.png', sizes: 'any', type: 'image/png' },
    ],
  };
}
