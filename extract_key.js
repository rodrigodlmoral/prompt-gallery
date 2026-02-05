import fs from 'fs';

const content = fs.readFileSync('dist/assets/store-CizSyIIn.js', 'utf8');
const regex = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;
const matches = content.match(regex);

if (matches) {
    fs.writeFileSync('temp_key.txt', matches[0]);
    console.log('Key saved to temp_key.txt');
} else {
    console.log('No matches found');
}
