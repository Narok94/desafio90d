const fs = require('fs');
let content = fs.readFileSync('src/components/BottomNav.tsx', 'utf-8');
content = content.replace(
  'className="fixed bottom-0 left-0 right-0 p-4 bg-slate-50/80 backdrop-blur-md border-t border-slate-100 z-50 flex justify-center"',
  'className="fixed bottom-0 left-0 right-0 bg-slate-50/80 backdrop-blur-md border-t border-slate-100 z-50 flex justify-center pb-[calc(1rem+env(safe-area-inset-bottom))] px-4 pt-4"'
);
fs.writeFileSync('src/components/BottomNav.tsx', content);
