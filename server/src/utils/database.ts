import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const initializeDatabase = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Create default admin user if it doesn't exist
    const adminExists = await prisma.user.findUnique({
      where: { email: 'admin@webscraperpro.com' }
    });

    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await prisma.user.create({
        data: {
          email: 'admin@webscraperpro.com',
          username: 'admin',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN'
        }
      });
      
      console.log('✅ Default admin user created (email: admin@webscraperpro.com, password: admin123)');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export { prisma };
