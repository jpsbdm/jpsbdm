export type TransactionType = 'Despesa' | 'Receita' | 'Transferência'
export type EmpresaType = 'Pessoal' | 'Marmitas' | 'Personal Chef'
export type BankSource = 'CBA' | 'ANZ' | 'Qantas' | 'Manual'

export interface Transaction {
  id: number
  date: string // ISO string
  description: string
  bank: string
  type: TransactionType
  category: string
  subcategory: string
  empresa: EmpresaType
  amount: number
  notes: string
  exported: boolean
  importedFrom?: string | null
  externalRef?: string | null
  createdAt: string
  updatedAt: string
}

export interface Budget {
  id: number
  month: number
  year: number
  category: string
  amount: number
}

export interface SavingsGoal {
  id: number
  name: string
  currentAmount: number
  targetAmount: number
  weeklyContrib: number
  startDate: string
  updatedAt: string
}

export interface AllowedDevice {
  id: number
  fingerprint: string
  name: string
  lastSeen: string
  createdAt: string
}

export interface ParsedTransaction {
  date: Date
  amount: number
  description: string
  type: TransactionType
  bank: string
  source: BankSource
  externalRef: string
  // campos para preenchimento pelo usuário
  category?: string
  subcategory?: string
  empresa?: EmpresaType
  notes?: string
  isDuplicate?: boolean
}

export interface AccountBalance {
  bank: string
  initialAmount: number
  initialDate: string
  currentBalance: number
}

export interface DashboardData {
  kpis: {
    receitas: number
    despesas: number
    saldo: number
    pendentesGrao: number
  }
  trend: Array<{
    month: string
    receitas: number
    despesas: number
  }>
  categories: Array<{
    name: string
    value: number
  }>
  companies: {
    marmitas: { receita: number; custo: number; lucro: number }
    personalChef: { receita: number; custo: number; lucro: number }
  }
  recentTransactions: Transaction[]
  analysis5030: {
    necessidades: number
    desejos: number
    poupanca: number
    totalReceita: number
  }
  accountBalances: AccountBalance[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  pages: number
  page: number
}

export interface ApiError {
  error: string
}
