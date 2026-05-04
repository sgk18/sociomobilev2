
const fs = require('fs');
const content = fs.readFileSync('c:/projects/SOCIO/sociomobilev2/app/club/[id]/ClubDetailClient.tsx', 'utf8');

const tags = [];
const tagRegex = /<(\/?[a-zA-Z0-9]+)/g;
let match;

while ((match = tagRegex.exec(content)) !== null) {
  const tagName = match[1];
  if (tagName.startsWith('/')) {
    const last = tags.pop();
    if (last !== tagName.substring(1)) {
      console.log(`Mismatch: Expected ${last}, found ${tagName} at position ${match.index}`);
    }
  } else {
    // Check if self-closing
    const tagEnd = content.indexOf('>', match.index);
    if (content[tagEnd - 1] !== '/') {
        tags.push(tagName);
    }
  }
}

console.log('Remaining tags:', tags);
