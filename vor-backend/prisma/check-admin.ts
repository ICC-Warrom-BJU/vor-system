import 'dotenv/config'
import pkg from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
const { PrismaClient } = pkg
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
})

async function main() {
  const adminEmail = 'admin@vor.com'
  
  // Check if admin exists
  const admin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (admin) {
    console.log('✓ Admin account exists:', adminEmail)
    console.log('  Name:', admin.name)
    console.log('  Role:', admin.role)
  } else {
    console.log('✗ Admin account NOT found:', adminEmail)
    console.log('Creating admin account...')
    
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const newAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin VOR',
        password: hashedPassword,
        role: 'ADMIN'
      }
    })
    
    console.log('✓ Admin account created successfully!')
    console.log('  Email:', newAdmin.email)
    console.log('  Name:', newAdmin.name)
    console.log('  Role:', newAdmin.role)
    console.log('  Password: admin123')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
