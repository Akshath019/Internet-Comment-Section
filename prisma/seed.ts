import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Example thread
  await db.thread.upsert({
    where: { urlHash: 'seed_example' },
    update: {},
    create: {
      normalizedUrl: 'https://news.ycombinator.com',
      urlHash: 'seed_example',
      originalUrl: 'https://news.ycombinator.com',
      domain: 'news.ycombinator.com',
      title: 'Hacker News',
    },
  })

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
