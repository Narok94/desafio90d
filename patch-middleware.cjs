const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  '// Allow parsing of large base64 payloads',
  `app.use(async (req, res, next) => {
  try {
    await dbInitPromise;
    next();
  } catch (err) {
    console.error("DB Init error:", err);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

// Allow parsing of large base64 payloads`
);
fs.writeFileSync('server.ts', content);
