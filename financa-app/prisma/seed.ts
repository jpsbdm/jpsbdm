import { PrismaClient } from '@prisma/client'

// Inlined to avoid importing lib/utils (not present in Docker runner stage)
function inferAccountType(name: string): string {
  const l = name.toLowerCase()
  if (l.includes('poupan') || l.includes('saving')) return 'poupanca'
  if (l.includes('cartão') || l.includes('card') || l.includes('credit') || l.includes('qantas') || l.includes('zip')) return 'credito'
  if (l.includes('empréstimo') || l.includes('loan') || l.includes('latitude') || l.includes('pessoal')) return 'emprestimo'
  if (l.includes('dinheiro') || l.includes('cash')) return 'dinheiro'
  if (l.includes('invest')) return 'investimento'
  return 'corrente'
}

const ACCOUNT_COLORS: Record<string, string> = {
  corrente: '#0D9488', poupanca: '#16A34A', credito: '#7C3AED',
  emprestimo: '#E11D48', dinheiro: '#D97706', investimento: '#3B82F6',
}

const prisma = new PrismaClient()

const defaultCategories: Record<string, string[]> = {
  'Despesas não Obrigatórias': [
    'Assinaturas e Serviços', 'Compras', 'Esportes', 'Lazer', 'Outros',
    'Presentes e Doações', 'Restaurantes', 'Tarifas Bancárias', 'Vestuário', 'Viagens',
  ],
  'Despesas Obrigatórias': [
    'Alimentação', 'Casa', 'Casa de Veraneio', 'Cuidados Pessoais', 'Despesas Médicas',
    'Educação', 'Filhos e Família', 'Impostos e Taxas', 'Mercado', 'Pets',
    'Prestadores de Serviços', 'Profissional e Trabalho', 'Saúde', 'Seguro',
    'Serviços Financeiros', 'Transporte',
  ],
  'Dívida': ['Dívidas e Empréstimos'],
  'Empresa e Autônomos': [
    'Colaboradores', 'Ferramentas', 'Infraestrutura', 'Insumos e Outros', 'Marketing',
    'Meios de Pagamento', 'Prestadores de Serviço - Empresa', 'Taxas e Impostos - Empresa',
  ],
  'Movimentações Internas': ['Transferência entre Contas', 'Pagamento de Cartão', 'Pagamento de Empréstimo'],
  'Renda': ['Outras Fontes de Renda', 'Renda Cliente', 'Renda Cônjuge / Negócios'],
}

const defaultBanks = [
  'CBA - Conta Corrente',
  'CBA - Poupança',
  'ANZ - Conta Corrente',
  'Qantas Money - Cartão',
  'Zip Pay',
  'Zip Money ANZ',
  'Latitude',
  'Empréstimo Pessoal',
  'Dinheiro',
  'Outro',
]

async function main() {
  // Settings
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      banks: JSON.stringify(defaultBanks),
      categories: JSON.stringify(defaultCategories),
    },
  })

  // Garante que todos os defaultBanks estão na lista
  const currentBanks: string[] = JSON.parse(settings.banks)
  const mergedBanks = Array.from(new Set([...currentBanks, ...defaultBanks]))
  if (mergedBanks.length !== currentBanks.length) {
    await prisma.settings.update({
      where: { id: 1 },
      data: { banks: JSON.stringify(mergedBanks) },
    })
  }

  // Garante que todas as categorias padrão existem (merge sem sobrescrever as do usuário)
  const currentCats: Record<string, string[]> = JSON.parse(settings.categories)
  let catsChanged = false
  for (const [cat, subs] of Object.entries(defaultCategories)) {
    if (!currentCats[cat]) {
      currentCats[cat] = subs
      catsChanged = true
    } else {
      const merged = Array.from(new Set([...currentCats[cat], ...subs]))
      if (merged.length !== currentCats[cat].length) {
        currentCats[cat] = merged
        catsChanged = true
      }
    }
  }
  if (catsChanged) {
    await prisma.settings.update({
      where: { id: 1 },
      data: { categories: JSON.stringify(currentCats) },
    })
  }

  // Metas de poupança
  const goalsCount = await prisma.savingsGoal.count()
  if (goalsCount === 0) {
    await prisma.savingsGoal.createMany({
      data: [
        { name: 'Fundo de Emergência', currentAmount: 0, targetAmount: 15000, weeklyContrib: 200, startDate: new Date() },
        { name: 'Viagem / Objetivo 2', currentAmount: 0, targetAmount: 5000, weeklyContrib: 100, startDate: new Date() },
      ],
    })
  }

  // Contas — migra de Settings.initialBalances se não houver nenhuma
  const accountCount = await prisma.account.count()
  if (accountCount === 0) {
    const freshSettings = await prisma.settings.findUnique({ where: { id: 1 } })
    const banks: string[] = JSON.parse(freshSettings?.banks ?? '[]')
    const initialBalances: Record<string, { amount: number; date: string }> =
      JSON.parse(freshSettings?.initialBalances ?? '{}')

    for (const bank of banks) {
      if (bank === 'Outro') continue
      const type = inferAccountType(bank)
      const balData = initialBalances[bank]
      await prisma.account.create({
        data: {
          name: bank,
          type,
          color: ACCOUNT_COLORS[type] ?? '#0D9488',
          initialBalance: balData?.amount ?? 0,
          initialDate: balData?.date ? new Date(balData.date) : new Date(),
        },
      })
    }
  }

  console.log('✅ Seed completo')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
