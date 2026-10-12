/**
 * RelatedLinks
 *
 * External resource links shown on every role dashboard — social media,
 * documentation, repository, and support channels. Opens in a new tab.
 * Icon-only tiles: no brand colors, just gray in light mode / white in dark mode.
 */

import { Github, Twitter, Linkedin, BookOpen, LifeBuoy, Globe } from 'lucide-react'

const links = [
  {
    id: 'website',
    label: 'Official Website',
    href: 'https://voltraak.com',
    icon: Globe,
  },
  {
    id: 'github',
    label: 'GitHub Repository',
    href: 'https://github.com/voltraak',
    icon: Github,
  },
  {
    id: 'twitter',
    label: 'Twitter / X',
    href: 'https://twitter.com/voltraak',
    icon: Twitter,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/voltraak',
    icon: Linkedin,
  },
  {
    id: 'docs',
    label: 'Documentation',
    href: 'https://docs.voltraak.com',
    icon: BookOpen,
  },
  {
    id: 'support',
    label: 'Support Center',
    href: 'https://support.voltraak.com',
    icon: LifeBuoy,
  },
]

export default function RelatedLinks() {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Related Links</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Resources, community, and support
        </p>
      </div>

      <div className="card-body">
        <div className="flex flex-wrap gap-3">
          {links.map((link) => (
            <LinkTile key={link.id} link={link} />
          ))}
        </div>
      </div>
    </div>
  )
}

function LinkTile({ link }) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      title={link.label}
      aria-label={link.label}
      className="group flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 p-3 transition-colors hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <link.icon className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
    </a>
  )
}
