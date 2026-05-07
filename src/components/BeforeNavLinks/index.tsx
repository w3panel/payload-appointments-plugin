'use client'

import type { ReactElement } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { NavGroup, useConfig, useNav } from '@payloadcms/ui'

import { links } from '../../lib/links'

const baseClass = 'nav'

export default function BeforeNavLinks(): ReactElement {
  const {
    config: {
      routes: { admin: adminRoute },
    },
  } = useConfig()
  const { navOpen } = useNav()
  const [pathname, setPathname] = useState<string>('')

  useEffect(() => {
    setPathname(window.location.pathname)
  }, [])

  const normalizedAdminRoute = useMemo(() => {
    const route = adminRoute || '/admin'
    return route.endsWith('/') ? route.slice(0, -1) : route
  }, [adminRoute])

  return (
    <NavGroup label="Appointments">
      {links.map((link) => {
        const href = `${normalizedAdminRoute}${link.url}`
        const activeCollection = pathname === href

        return (
          <a
            className={[`${baseClass}__link`, activeCollection && `active`]
              .filter(Boolean)
              .join(' ')}
            href={href}
            key={link.url}
            tabIndex={!navOpen ? -1 : undefined}
          >
            {activeCollection && <div className={`${baseClass}__link-indicator`} />}
            <span className={`${baseClass}__link-label`}>{link.title}</span>
          </a>
        )
      })}
    </NavGroup>
  )
}
