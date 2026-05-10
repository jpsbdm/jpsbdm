import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const defaultCategories: Record<string, string[]> = {
  // 1 - Despesas Não Obrigatórias
  'Assinaturas e Serviços': [],
  'Compras': [],
  'Esportes': [],
  'Lazer': [],
  'Outros': [],
  'Presentes e Doações': [],
  'Restaurantes': [],
  'Tarifas Bancárias': [],
  'Vestuário': [],
  'Viagens': [],
  // 2 - Despesas Obrigatórias
  'Alimentação': [],
  'Casa': [],
  'Casa de Veraneio': [],
  'Cuidados Pessoais': [],
  'Despesas Médicas': [],
  'Educação': [],
  'Filhos e Família': [],
  'Impostos e Taxas': [],
  'Mercado': [],
  'Pets': [],
  'Prestadores de Serviços': [],
  'Profissional e Trabalho': [],
  'Saúde': [],
  'Seguro': [],
  'Serviços Financeiros': [],
  'Transporte': [],
  // 3 - Dívida
  'Dívidas e Empréstimos': [],
  // 4 - Empresa e Autônomos
  'Colaboradores': [],
  'Ferramentas': [],
  'Infraestrutura': [],
  'Insumos e Outros': [],
  'Marketing': [],
  'Meios de Pagamento': [],
  'Prestadores de Serviço - Empresa': [],
  'Taxas e Impostos - Empresa': [],
  // 5 - Renda
  'Outras Fontes de Renda': [],
  'Renda Cliente': [],
  'Renda Cônjuge': [],
}

const defaultBanks = [
  'CBA - Conta Corrente',
  'CBA - Savings',
  'ANZ - Conta Corrente',
  'ANZ - Savings',
  'Qantas Money',
  'Dinheiro',
  'Outro',
]

async function main() {
  // Cria Settings padrão
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      banks: JSON.stringify(defaultBanks),
      categories: JSON.stringify(defaultCategories),
    },
    create: {
      id: 1,
      banks: JSON.stringify(defaultBanks),
      categories: JSON.stringify(defaultCategories),
    },
  })

  // Cria metas de poupança iniciais
  const goalsCount = await prisma.savingsGoal.count()
  if (goalsCount === 0) {
    await prisma.savingsGoal.createMany({
      data: [
        {
          name: 'Fundo de Emergência',
          currentAmount: 0,
          targetAmount: 15000,
          weeklyContrib: 200,
          startDate: new Date(),
        },
        {
          name: 'Viagem / Objetivo 2',
          currentAmount: 0,
          targetAmount: 5000,
          weeklyContrib: 100,
          startDate: new Date(),
        },
      ],
    })
  }

  console.log('✅ Seed completo — settings e metas criadas')
  console.log('')
  console.log('⚠️  Para adicionar seu dispositivo, acesse /config/devices após o primeiro login.')
  console.log('   Nenhum dispositivo foi adicionado automaticamente — o primeiro login requer')
  console.log('   que NEXT_PUBLIC_SKIP_DEVICE_CHECK=true esteja no .env.local (apenas em dev).')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
