const { Client } = require('pg');

async function seedDepartments() {
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/hrperformance' 
  });
  
  await client.connect();
  
  const departments = [
    'Executive Leadership',
    'Academic Affairs',
    'Enrollment & Student Services',
    'Office of Compliance',
    'Information Technology'
  ];
  
  for (const dept of departments) {
    const generatedId = 'dept_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
    const now = new Date().toISOString();
    
    try {
      await client.query(
        'INSERT INTO "Department" ("id", "name", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4)',
        [generatedId, dept, now, now]
      );
      console.log('✅ Created department:', dept);
    } catch (e) {
      if (e.code === '23505') {
        console.log('⏭️  Department already exists:', dept);
      } else {
        throw e;
      }
    }
  }
  
  await client.end();
  console.log('✅ Department seeding complete!');
}

seedDepartments().catch(console.error);
