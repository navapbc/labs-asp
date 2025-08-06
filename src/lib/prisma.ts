import pkg from '@prisma/client'
const { PrismaClient } = pkg

const globalForPrisma = global as unknown as { 
  prisma: typeof PrismaClient.prototype | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma