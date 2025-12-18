const express = require("express");
require("./index");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Word Blocker Bot</title>
        <style>
          body {
            background:#0f172a;
            color:white;
            font-family:Arial;
            text-align:center;
            padding-top:60px;
          }
        </style>
      </head>
      <body>
        <h1>✅ Discord Word Blocker Bot</h1>
        <p>Status: Online</p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log("🌐 Web server running on port " + PORT);
});
