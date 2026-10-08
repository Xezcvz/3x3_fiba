require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Tournament Administrator';

  if (!username || !/^[A-Za-z0-9._-]{3,32}$/.test(username)) {
    throw new Error('ADMIN_USERNAME must be 3–32 characters using letters, numbers, dot, underscore, or hyphen.');
  }
  if (!password || password.length < 14 || password.length > 128) {
    throw new Error('ADMIN_PASSWORD must be between 14 and 128 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existingAdmin = await prisma.admin.findUnique({ where: { username } });
  if (existingAdmin) {
    await prisma.admin.update({ where: { username }, data: { password: passwordHash, name } });
    console.log('Administrator password updated for username: ' + username);
    return;
  }
  await prisma.admin.create({ data: { username, password: passwordHash, name } });
  console.log('Administrator account created for username: ' + username);
}

createAdmin()
  .catch((error) => {
    console.error('Could not create administrator:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
