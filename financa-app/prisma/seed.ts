import { PrismaClient } from '@prisma/client'
import { inferAccountType, ACCOUNT_TYPE_COLORS } from '../lib/utils'

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
          color: ACCOUNT_TYPE_COLORS[type],
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
