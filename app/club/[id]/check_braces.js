
const fs = require('fs');
const content = fs.readFileSync('c:/projects/SOCIO/sociomobilev2/app/club/[id]/ClubDetailClient.tsx', 'utf8');

let braceCount = 0;
let angleCount = 0;
let inString = false;
let stringChar = '';

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (inString) {
    if (char === stringChar) inString = false;
    continue;
  }
  if (char === '"' || char === "'" || char === '`') {
    inString = true;
    stringChar = char;
    continue;
  }

  if (char === '{') braceCount++;
  if (char === '}') braceCount--;
  // Note: angle brackets are harder because of < and > in code, but in JSX they are mostly tags.
}

console.log('Brace count:', braceCount);
