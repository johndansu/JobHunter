const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkScrapedData() {
  try {
    console.log('🔍 Checking scraped data...\n');
    
    // Check all scraped data
    const allData = await prisma.scrapedData.findMany({
      include: {
        job: true
      },
      orderBy: {
        scrapedAt: 'desc'
      }
    });
    
    console.log(`📊 Total scraped data records: ${allData.length}\n`);
    
    if (allData.length > 0) {
      console.log('📋 Recent scraped data:');
      allData.slice(0, 5).forEach((data, index) => {
        console.log(`\n${index + 1}. Job: ${data.job?.name || 'Unknown'}`);
        console.log(`   URL: ${data.url}`);
        console.log(`   Scraped: ${data.scrapedAt}`);
        console.log(`   Data: ${JSON.stringify(data.data, null, 2)}`);
      });
    }
    
    // Check recent jobs
    const recentJobs = await prisma.job.findMany({
      include: {
        executions: {
          orderBy: {
            startedAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    });
    
    console.log('\n🔧 Recent jobs:');
    recentJobs.forEach((job, index) => {
      console.log(`\n${index + 1}. ${job.name}`);
      console.log(`   URL: ${job.url}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Config: ${job.config}`);
      if (job.executions.length > 0) {
        const execution = job.executions[0];
        console.log(`   Last execution: ${execution.status}`);
        console.log(`   Started: ${execution.startedAt}`);
        console.log(`   Completed: ${execution.completedAt}`);
        console.log(`   Logs: ${execution.logs}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking scraped data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScrapedData();
