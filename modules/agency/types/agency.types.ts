export type BusinessType =
  | 'AGENCY'
  | 'TOUR_OPERATOR'
  | 'TRANSPORT'
  | 'INDEPENDENT_GUIDE'

export type AgencyStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'INACTIVE'

export type AgencyAction =
  | 'DRAFT'
  | 'SUBMIT'

export interface ServiceCategory {
  id: number
  name: string
  active: boolean
}

export interface Language {
  id: number
  name: string
  code: string
  active: boolean
}

export interface Agency {
  id: string
  ownerUserId: string

  agencyName: string
  commercialName: string
  businessType: BusinessType
  description: string | null

  email: string | null
  phone: string | null
  website: string | null

  country: string | null
  province: string | null
  city: string | null
  exactAddress: string | null

  logoUrl: string | null
  coverUrl: string | null
  verificationDocumentUrl: string | null

  instagramUrl: string | null
  facebookUrl: string | null
  whatsapp: string | null

  status: AgencyStatus

  acceptedTerms: boolean
  termsAcceptedAt: string | null

  createdAt: string
  updatedAt: string

  categories: ServiceCategory[]
  languages: Language[]
}

export interface AgencyFormData {
  agencyName: string
  commercialName: string
  businessType: BusinessType | ''

  description: string

  email: string
  phone: string
  website: string

  country: string
  province: string
  city: string
  exactAddress: string

  logoUrl: string
  coverUrl: string
  verificationDocumentUrl: string

  instagramUrl: string
  facebookUrl: string
  whatsapp: string

  categoryIds: number[]
  languageIds: number[]

  acceptedTerms: boolean
}

export interface SaveAgencyPayload extends AgencyFormData {
  action: AgencyAction
}