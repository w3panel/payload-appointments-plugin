'use client'

import React, { useEffect, useMemo, useState } from 'react'

import { Button, Pill } from '@payloadcms/ui'
import { useConfig, useDocumentInfo } from '@payloadcms/ui'

import { CUSTOM_CONFIG_KEY } from '../../types/config'
import type { AppointmentsBuildConfig } from '../../types/config'

type HostServiceConfigRow = {
  id: string
  enabled?: boolean
  key?: string
  service?: { id?: string; title?: string; name?: string } | string
  price?: number | null
  paymentRequired?: boolean
}

export default function HostServiceConfigsField() {
  const { id, collectionSlug } = useDocumentInfo()
  const { config } = useConfig()

  const buildConfig = useMemo(() => {
    return (config as any)?.custom?.[CUSTOM_CONFIG_KEY] as AppointmentsBuildConfig | undefined
  }, [config])

  const hostServiceConfigsSlug = buildConfig?.hostServiceConfigsSlug ?? 'hostServiceConfigs'

  const [rows, setRows] = useState<HostServiceConfigRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!id) return
      setLoading(true)
      setError(null)

      try {
        const where = encodeURIComponent(JSON.stringify({ host: { equals: id } }))
        const url = `/api/${hostServiceConfigsSlug}?depth=1&limit=50&where=${where}`
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`)
        }
        const json = (await res.json()) as any

        if (cancelled) return
        setRows(json?.docs ?? [])
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load host service configs')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [id, hostServiceConfigsSlug])

  const openFilteredListHref = useMemo(() => {
    if (!id) return null
    const where = encodeURIComponent(JSON.stringify({ host: { equals: id } }))
    return `/admin/collections/${hostServiceConfigsSlug}?where=${where}`
  }, [hostServiceConfigsSlug, id])

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontWeight: 600 }}>Service configuration</div>
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            {collectionSlug ? `Host: ${collectionSlug}` : 'Host'} · Join collection: {hostServiceConfigsSlug}
          </div>
        </div>
        {openFilteredListHref ? (
          <Button
            size="small"
            buttonStyle="secondary"
            onClick={() => {
              window.location.assign(openFilteredListHref)
            }}
          >
            Manage in list view
          </Button>
        ) : null}
      </div>

      {loading ? <div>Loading…</div> : null}
      {error ? (
        <div style={{ color: 'var(--theme-error-500)' }}>
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        rows.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No service configs found for this host.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {rows.map((row) => {
              const serviceLabel =
                typeof row.service === 'string'
                  ? row.service
                  : row.service?.title ?? row.service?.name ?? row.service?.id ?? 'Service'

              return (
                <div
                  key={row.id}
                  style={{
                    border: '1px solid var(--theme-elevation-200)',
                    borderRadius: 6,
                    padding: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ fontWeight: 600 }}>{serviceLabel}</div>
                    <div style={{ opacity: 0.8, fontSize: 13 }}>
                      {row.price != null ? `Price: ${row.price}` : 'Price: —'}
                      {row.paymentRequired ? ' · Payment required' : ''}
                    </div>
                  </div>

                  <Pill
                    pillStyle={row.enabled === false ? 'warning' : 'success'}
                  >
                    {row.enabled === false ? 'Disabled' : 'Enabled'}
                  </Pill>
                </div>
              )
            })}
          </div>
        )
      ) : null}
    </div>
  )
}

