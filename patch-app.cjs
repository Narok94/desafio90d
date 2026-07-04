const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(
  '<main className="w-full">',
  '<main className="w-full pb-[calc(100px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">'
);
fs.writeFileSync('src/App.tsx', content);
