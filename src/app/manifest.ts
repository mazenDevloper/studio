
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DriveCast Sovereign Hub',
    short_name: 'DriveCast',
    description: 'Unified System Hub for Car OS - Sovereign Edition',
    start_url: '/',
    display: 'fullscreen',
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'landscape',
    icons: [
      {
        src: 'https://www.image2url.com/r2/default/images/1782382707952-d99447c6-bc60-475d-9406-5fd2ef320bd5.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
