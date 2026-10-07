'use client'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  createAgency,
  deleteMyAgency,
  getMyAgency,
  updateMyAgency,
} from '../services/agency.service'

import type {
  Agency,
  SaveAgencyPayload,
} from '../types/agency.types'

export function useAgency() {
  const [agency, setAgency] = useState<Agency | null>(null)

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const loadAgency = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await getMyAgency()

      setAgency(data)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la agencia.'

      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => { void loadAgency() })
  }, [loadAgency])

  const create = async (
    payload: SaveAgencyPayload,
  ) => {
    try {
      setSaving(true)
      setError(null)

      const data = await createAgency(payload)

      setAgency(data)

      return data
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo crear la agencia.'

      setError(message)

      throw err
    } finally {
      setSaving(false)
    }
  }

  const update = async (
    payload: SaveAgencyPayload,
  ) => {
    try {
      setSaving(true)
      setError(null)

      const data = await updateMyAgency(payload)

      setAgency(data)

      return data
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la agencia.'

      setError(message)

      throw err
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    try {
      setSaving(true)
      setError(null)

      await deleteMyAgency()

      setAgency(null)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo desactivar la agencia.'

      setError(message)

      throw err
    } finally {
      setSaving(false)
    }
  }

  return {
    agency,
    loading,
    saving,
    error,

    loadAgency,
    createAgency: create,
    updateAgency: update,
    deleteAgency: remove,
  }
}