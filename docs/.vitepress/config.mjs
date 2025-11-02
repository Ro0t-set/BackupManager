import { defineConfig } from 'vitepress'

export default defineConfig({
  lastUpdated: true,
  base: '/BackupManager/',
  ignoreDeadLinks: [/^https?:\/\/localhost/, /^(?:\.\/)?api\//],
  locales: {
    root: {
      label: 'Italiano',
      lang: 'it-IT',
      title: 'BackupManager',
      description: 'Gestione backup multi-destinazione con FastAPI + React',
      themeConfig: {
        nav: [
          { text: 'Introduzione', link: '/' },
          { text: 'Guida', link: '/guide/getting-started' },
          { text: 'Backend', link: '/guide/backend' },
          { text: 'Frontend', link: '/guide/frontend' },
          { text: 'API', link: '/guide/api' }
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Guida',
              items: [
                { text: 'Getting Started', link: '/guide/getting-started' },
                { text: 'Backend', link: '/guide/backend' },
                { text: 'Frontend', link: '/guide/frontend' },
                { text: 'API', link: '/guide/api' }
              ]
            }
          ]
        },
        socialLinks: [
          { icon: 'github', link: 'https://github.com/Ro0t-set/BackupManager' }
        ],
        editLink: {
          pattern: 'https://github.com/Ro0t-set/BackupManager/edit/main/docs/:path',
          text: 'Modifica questa pagina su GitHub'
        },
        footer: {
          message: 'Rilasciato sotto licenza MIT.',
          copyright: `© ${new Date().getFullYear()} BackupManager`
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'BackupManager',
      description: 'Multi-destination backup management with FastAPI + React',
      themeConfig: {
        nav: [
          { text: 'Introduction', link: '/en/' },
          { text: 'Guide', link: '/en/guide/getting-started' },
          { text: 'Backend', link: '/en/guide/backend' },
          { text: 'Frontend', link: '/en/guide/frontend' },
          { text: 'API', link: '/en/guide/api' }
        ],
        sidebar: {
          '/en/guide/': [
            {
              text: 'Guide',
              items: [
                { text: 'Getting Started', link: '/en/guide/getting-started' },
                { text: 'Backend', link: '/en/guide/backend' },
                { text: 'Frontend', link: '/en/guide/frontend' },
                { text: 'API', link: '/en/guide/api' }
              ]
            }
          ]
        },
        socialLinks: [
          { icon: 'github', link: 'https://github.com/Ro0t-set/BackupManager' }
        ],
        editLink: {
          pattern: 'https://github.com/Ro0t-set/BackupManager/edit/main/docs/:path',
          text: 'Edit this page on GitHub'
        },
        footer: {
          message: 'Released under the MIT License.',
          copyright: `© ${new Date().getFullYear()} BackupManager`
        }
      }
    }
  },
  sitemap: {
    hostname: 'https://www.tommasopatriti.me'
  }
})
