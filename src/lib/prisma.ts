import pkg from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const { PrismaClient } = pkg

const globalForPrisma = global as unknown as { 
  prisma: typeof PrismaClient.prototype | undefined
}

// Create the adapter for the queryCompiler feature
const connectionString = process.env.DATABASE_URL!
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ 
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma