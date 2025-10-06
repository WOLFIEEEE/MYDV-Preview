/**
 * Type definitions for First2Page template system
 */

export interface ConditionalLogic {
  type: 'show' | 'hide'
  logic: 'all' | 'any'
  conditional: Array<{
    name: string
    rule: 'is' | 'isnot' | 'contains' | 'greater_than' | 'less_than'
    value: string
  }>
}

export interface TemplateElement {
  type: 'text' | 'image' | 'divider' | 'signature' | 'spacer'
  container_style?: Record<string, string>
  inner_style?: Record<string, Record<string, string>>
  inner_attr?: Record<string, Record<string, string>>
  condition?: string
  columnIndex?: number
  elementIndex?: number
}

export interface TemplateColumn {
  elements: Record<string, TemplateElement>
}

export interface TemplateRow {
  style: Record<string, string>
  attr?: Record<string, string>
  type: string
  columns: Record<string, TemplateColumn>
  condition?: string
  index?: number
  elements?: TemplateElement[]
}

export interface First2PageTemplate {
  container: Record<string, string>
  rows: Record<string, TemplateRow>
}

export interface EditableField {
  id: string
  name: string
  type: 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'select' | 'textarea'
  value: any
  label: string
  options?: string[]
  required?: boolean
  placeholder?: string
  condition?: boolean
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

export interface EditableSection {
  id: string
  title: string
  fields: EditableField[]
  condition?: string
  visible: boolean
  canAddRows?: boolean
  canRemoveRows?: boolean
}

export interface InvoiceEditorState {
  formData: Record<string, any>
  visibleSections: EditableSection[]
  template: First2PageTemplate
  isDirty: boolean
  errors: Record<string, string>
}

export interface FinanceCompany {
  id: string
  name: string
  displayName: string
  address: {
    line1: string
    line2?: string
    city: string
    postcode: string
    phone?: string
    email?: string
  }
  templateRowIndex: number
}

export const FINANCE_COMPANIES: FinanceCompany[] = [
  {
    id: 'jigsaw',
    name: 'Jigsaw Finance',
    displayName: 'Jigsaw Finance',
    address: {
      line1: 'Genesis Centre, Innovation Way',
      city: 'Stoke on Trent',
      postcode: 'ST6 4BF',
      phone: '01782432262',
      email: 'payouts@jigsawfinance.com'
    },
    templateRowIndex: 4
  },
  {
    id: 'car-loans-365',
    name: 'Car Loans 365',
    displayName: 'HT Finance Limited (T/A Car Loans 365)',
    address: {
      line1: 'Statham House, Talbot Road',
      city: 'Old Trafford',
      postcode: 'M32 0FP'
    },
    templateRowIndex: 6
  },
  {
    id: 'close-brothers',
    name: 'Close Brothers Finance',
    displayName: 'Close Brothers Finance',
    address: {
      line1: '10 Crown Place',
      city: 'London',
      postcode: 'EC2A 4FT'
    },
    templateRowIndex: 7
  },
  {
    id: 'zuto',
    name: 'Zuto Finance',
    displayName: 'ZUTO Finance',
    address: {
      line1: 'Winterton House, Winterton Way',
      city: 'Macclesfield, Cheshire',
      postcode: 'SK11 OLP',
      phone: '01625 61 99 44'
    },
    templateRowIndex: 8
  },
  {
    id: 'car-finance-247',
    name: 'Car Finance 247',
    displayName: 'Car Finance 24/7',
    address: {
      line1: 'Universal Square, Block 5 Devonshire Street',
      city: 'Manchester',
      postcode: 'M12 6JH'
    },
    templateRowIndex: 9
  },
  {
    id: 'oodle',
    name: 'Oodle Finance',
    displayName: 'Oodle Car Finance',
    address: {
      line1: 'Floor 19, City Tower',
      line2: 'New York Street',
      city: 'Manchester',
      postcode: 'M1 4BT'
    },
    templateRowIndex: 10
  },
  {
    id: 'blue-motor',
    name: 'Blue Motor Finance',
    displayName: 'Blue Motor Finance',
    address: {
      line1: 'Darenth House, 84 Main Rd',
      city: 'Sundridge, Sevenoaks',
      postcode: 'TN14 6ER'
    },
    templateRowIndex: 11
  },
  {
    id: 'car-loans-uk',
    name: 'Car Loans UK',
    displayName: 'BMG FG (UK) LTD',
    address: {
      line1: 'Wellington Road North',
      city: 'Stockport, Cheshire',
      postcode: 'SK4 1LW'
    },
    templateRowIndex: 12
  },
  {
    id: 'carmoney',
    name: 'CarMoney',
    displayName: 'CarMoney',
    address: {
      line1: 'Pioneer House, 2 Renshaw Pl',
      city: 'Eurocentral, Motherwell',
      postcode: 'ML1 4UF'
    },
    templateRowIndex: 13
  },
  {
    id: 'creditplus',
    name: 'CreditPlus',
    displayName: 'CreditPlus',
    address: {
      line1: 'Bourne House, 23 Hinton Road',
      city: 'Bournemouth',
      postcode: 'BH1 2EF'
    },
    templateRowIndex: 14
  },
  {
    id: 'choosemycar',
    name: 'ChooseMyCar',
    displayName: 'ChooseMyCar',
    address: {
      line1: 'Alexandra Court, Carrs Road',
      city: 'Cheadle',
      postcode: 'SK8 2JY'
    },
    templateRowIndex: 15
  },
  {
    id: 'other',
    name: 'Other',
    displayName: 'Other Finance Company',
    address: {
      line1: '',
      city: '',
      postcode: ''
    },
    templateRowIndex: 5
  }
]



