const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 确保dist目录存在
if (!fs.existsSync('dist')) {
  console.error('Error: dist directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// 获取当前目录
const currentDir = process.cwd();

// 部署函数
function deploy() {
  try {
    console.log('Deploying to GitHub Pages...');
    
    // 进入dist目录
    process.chdir('dist');
    
    // 初始化git仓库
    if (!fs.existsSync('.git')) {
      execSync('git init', { stdio: 'inherit' });
      execSync('git remote add origin https://github.com/JustLuoxi/christmas-tree.git', { stdio: 'inherit' });
    }
    
    // 配置git用户信息（可选，确保能提交）
    execSync('git config user.email "you@example.com"', { stdio: 'inherit' });
    execSync('git config user.name "GitHub Pages Deploy"', { stdio: 'inherit' });
    
    // 添加所有文件
    execSync('git add .', { stdio: 'inherit' });
    
    // 提交代码
    try {
      execSync('git commit -m "Deploy to GitHub Pages"', { stdio: 'inherit' });
    } catch (e) {
      // 如果没有新文件，commit会失败，这是正常的
      console.log('No changes to commit.');
    }
    
    // 强制推送到gh-pages分支
    execSync('git push -f origin master:gh-pages', { stdio: 'inherit' });
    
    console.log('Deployment successful!');
    
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  } finally {
    // 回到原来的目录
    process.chdir(currentDir);
  }
}

// 执行部署
deploy();