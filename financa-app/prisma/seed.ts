import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const defaultCategories: Record<string, string[]> = {
  'Moradia': ['Aluguel', 'Hipoteca', 'Condomínio', 'Seguro Residencial', 'Manutenção', 'Limpeza'],
  'Alimentação': ['Supermercado', 'Restaurante', 'Delivery', 'Café', 'Padaria', 'Açougue'],
  'Transporte': ['Combustível', 'Seguro Auto', 'Manutenção Auto', 'Transporte Público', 'Uber/Taxi', 'Registro Veículo'],
  'Saúde': ['Plano de Saúde', 'Médico', 'Dentista', 'Farmácia', 'Exames', 'Academia'],
  'Educação': ['Escola', 'Faculdade', 'Cursos', 'Livros', 'Material Escolar'],
  'Lazer': ['Streaming', 'Cinema', 'Shows', 'Viagens', 'Hobbies', 'Esportes'],
  'Vestuário': ['Roupas', 'Calçados', 'Acessórios'],
  'Tecnologia': ['Internet', 'Celular', 'Assinaturas', 'Hardware', 'Software'],
  'Finanças': ['Poupança', 'Investimento', 'Seguro', 'Imposto', 'Tarifas Bancárias'],
  'Utilidades': ['Energia', 'Água', 'Gás', 'Internet Casa'],
  'Pets': ['Veterinário', 'Ração', 'Acessórios Pet', 'Banho e Tosa'],
  'Presentes': ['Aniversário', 'Natal', 'Casamento', 'Outros Presentes'],
  'Receita': ['Salário', 'Freelance', 'Investimentos', 'Aluguel Recebido', 'Outras Receitas'],
  'Transferência': ['Entre Contas', 'Reembolso', 'Outros'],
  'Marmitas': ['Insumos', 'Embalagens', 'Transporte Entrega', 'Marketing', 'Equipamentos', 'Receita Marmitas'],
  'Personal Chef': ['Insumos Chef', 'Equipamentos Chef', 'Transporte Chef', 'Marketing Chef', 'Receita Chef'],
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
    update: {},
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
