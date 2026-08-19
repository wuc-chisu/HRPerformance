import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const row = await prisma.trainingProgramModule.findFirst({
    select: {
      id: true,
      status: true,
    },
  });

  console.log('OK', row ? row.status : 'NO_ROWS');
} finally {
  await prisma.$disconnect();
}
