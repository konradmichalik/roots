import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'roots',
  description: 'Work Time Overview — Moco, Jira, Outlook & Personio in one app',

  base: '/roots/',
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/roots/logo-sm.svg' }],
    ['meta', { name: 'theme-color', content: '#88c0d0' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'roots Documentation' }],
    ['meta', { property: 'og:description', content: 'Work Time Overview — Moco, Jira, Outlook & Personio' }],
    ['meta', { property: 'og:image', content: '/roots/images/roots-light.jpg' }]
  ],

  markdown: {
    lineNumbers: true
  },

  themeConfig: {
    logo: {
      light: '/logo.svg',
      dark: '/logo-dark.svg'
    },
    siteTitle: false,

    nav: [
      { text: 'Getting Started', link: '/getting-started/' },
      { text: 'Features', link: '/guide/' },
      { text: 'Connections', link: '/connections/' },
      { text: 'Desktop App', link: '/desktop/' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/konradmichalik/roots' },
          { text: 'Report Issue', link: 'https://github.com/konradmichalik/roots/issues' }
        ]
      }
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started/' },
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'Quick Start', link: '/getting-started/quick-start' }
          ]
        }
      ],
      '/connections/': [
        {
          text: 'Connections',
          items: [
            { text: 'Overview', link: '/connections/' },
            { text: 'Moco', link: '/connections/moco' },
            { text: 'Jira', link: '/connections/jira' },
            { text: 'Outlook', link: '/connections/outlook' },
            { text: 'Personio', link: '/connections/personio' }
          ]
        }
      ],
      '/guide/': [
        {
          text: 'Features',
          items: [
            { text: 'Overview', link: '/guide/' },
            { text: 'Timeline', link: '/guide/timeline' },
            { text: 'Timer & Booking', link: '/guide/timer' },
            { text: 'Statistics', link: '/guide/stats' },
            { text: 'Settings', link: '/guide/settings' }
          ]
        }
      ],
      '/desktop/': [
        {
          text: 'Desktop App',
          items: [
            { text: 'Overview', link: '/desktop/' },
            { text: 'Browser vs. Desktop', link: '/desktop/differences' }
          ]
        }
      ],
      '/development/': [
        {
          text: 'Development',
          items: [
            { text: 'Architecture', link: '/development/' },
            { text: 'API Clients', link: '/development/api-clients' },
            { text: 'Stores', link: '/development/stores' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/konradmichalik/roots' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2025-present'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/konradmichalik/roots/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    lastUpdated: {
      text: 'Last updated'
    },

    outline: {
      level: [2, 3],
      label: 'On this page'
    },

    docFooter: {
      prev: 'Previous',
      next: 'Next'
    }
  }
})
