const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.git', 'build', '.dart_tool', '.system_generated'].includes(file)) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath, fileList);
    } else if (/\.(js|html|json|md|dart|env|txt|yaml|yml)$/i.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const targetDomainPatterns = [
  /@charlieai.com\.com/gi,
  /@iconic-smart\.com/gi,
  /@iconic-samart\.com/gi,
  /@iconicsmart\.com/gi,
  /@iconic\.com/gi,
  /@charlieai.com/gi
];

const files = walk('.');
let totalReplacements = 0;
let modifiedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  let fileReplacements = 0;

  for (const pattern of targetDomainPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      fileReplacements += matches.length;
      content = content.replace(pattern, '@charlieai.com');
    }
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedFiles++;
    totalReplacements += fileReplacements;
    console.log(`Updated ${file}: ${fileReplacements} email domain replacement(s)`);
  }
}

console.log(`\n======================================================`);
console.log(`✅ Complete: ${totalReplacements} email replacements across ${modifiedFiles} files.`);
console.log(`======================================================`);
