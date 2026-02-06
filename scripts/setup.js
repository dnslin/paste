#!/usr/bin/env node

/**
 * 交互式设置脚本 - 自动生成环境变量和密码
 * Interactive setup script - automatically generate environment variables and passwords
 */

import { createInterface } from 'readline';
import { randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => readline.question(query, resolve));
}

function generateEncryptionKey() {
  return randomBytes(32).toString('hex');
}

function generateSessionSecret() {
  return randomBytes(32).toString('base64');
}

async function generatePasswordHash(password) {
  return await hash(password, 10);
}

async function main() {
  console.log('\n🚀 Paste 服务设置向导 / Paste Service Setup Wizard\n');
  console.log('此脚本将帮助您生成所需的环境变量配置');
  console.log('This script will help you generate the required environment variables\n');

  const envPath = join(process.cwd(), '.env');
  
  if (existsSync(envPath)) {
    const overwrite = await question('⚠️  .env 文件已存在。是否覆盖？ (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('❌ 设置已取消 / Setup cancelled');
      readline.close();
      process.exit(0);
    }
  }

  console.log('\n📝 配置管理员账户 / Configure Admin Account\n');
  
  // Ask user if they want to generate a password or set their own
  const passwordChoice = await question('选择密码设置方式 / Choose password setup method:\n  1. 自己输入密码 / Enter my own password\n  2. 自动生成随机密码 / Auto-generate random password\n请选择 / Choose (1/2): ');
  
  let adminPassword;
  
  if (passwordChoice === '2') {
    // Generate random password
    adminPassword = randomBytes(16).toString('base64').slice(0, 16);
    console.log('\n✨ 已生成随机密码 / Random password generated:');
    console.log(`   🔑 密码 / Password: ${adminPassword}`);
    console.log('   ⚠️  请务必保存此密码！/ Please save this password!\n');
    
    const confirm = await question('确认使用此密码？/ Confirm using this password? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ 设置已取消 / Setup cancelled');
      readline.close();
      process.exit(0);
    }
  } else {
    // User enters their own password
    let confirmPassword;
    
    do {
      adminPassword = await question('\n输入管理员密码 / Enter admin password: ');
      if (!adminPassword || adminPassword.length < 8) {
        console.log('❌ 密码至少需要 8 个字符 / Password must be at least 8 characters');
        continue;
      }
      
      confirmPassword = await question('确认管理员密码 / Confirm admin password: ');
      if (adminPassword !== confirmPassword) {
        console.log('❌ 密码不匹配，请重新输入 / Passwords do not match, please try again\n');
      }
    } while (adminPassword !== confirmPassword || !adminPassword || adminPassword.length < 8);
  }

  console.log('\n⏳ 生成配置中 / Generating configuration...\n');

  const encryptionKey = generateEncryptionKey();
  const sessionSecret = generateSessionSecret();
  const passwordHash = await generatePasswordHash(adminPassword);

  const envContent = `# 加密密钥 - 32字节 (64个十六进制字符)
# Encryption Key - 32 bytes (64 hex characters)
# 自动生成 / Auto-generated: ${new Date().toISOString()}
ENCRYPTION_KEY=${encryptionKey}

# 数据库路径 / Database Path
DATABASE_URL=file:./data/paste.db

# Admin 会话密钥 / Admin Session Secret
# 自动生成 / Auto-generated
SESSION_SECRET=${sessionSecret}

# Admin 密码哈希 / Admin Password Hash
# bcrypt hash (cost=10)
ADMIN_PASSWORD_HASH=${passwordHash}
`;

  writeFileSync(envPath, envContent);

  console.log('✅ 配置生成成功！/ Configuration generated successfully!\n');
  console.log('📄 生成的配置已保存到 .env 文件');
  console.log('   Generated configuration saved to .env file\n');
  console.log('🔐 请妥善保管您的管理员密码！');
  console.log('   Please keep your admin password safe!\n');
  console.log('📋 环境变量摘要 / Environment Variables Summary:');
  console.log('   ✓ ENCRYPTION_KEY: ' + encryptionKey.substring(0, 16) + '...');
  console.log('   ✓ SESSION_SECRET: ' + sessionSecret.substring(0, 16) + '...');
  console.log('   ✓ ADMIN_PASSWORD_HASH: ' + passwordHash.substring(0, 20) + '...');
  console.log('   ✓ DATABASE_URL: file:./data/paste.db\n');
  console.log('🎯 下一步 / Next Steps:');
  console.log('   1. 运行 npm run dev 启动开发服务器');
  console.log('      Run npm run dev to start the development server');
  console.log('   2. 访问 http://localhost:3000/admin 使用管理员账户登录');
  console.log('      Visit http://localhost:3000/admin to login with admin account\n');

  readline.close();
}

main().catch((error) => {
  console.error('❌ 设置失败 / Setup failed:', error.message);
  readline.close();
  process.exit(1);
});
