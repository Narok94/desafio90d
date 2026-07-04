const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace('const dbInitPromise = db.initialize();', '');
content = content.replace('const app = express();', 'const app = express();\nconst dbInitPromise = db.initialize();');
fs.writeFileSync('server.ts', content);
