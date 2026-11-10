const fs = require("fs");

const logger = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const time = Date.now() - startTime;

    const log = `${new Date().toLocaleString()} | ${req.method} | ${req.url} | ${res.statusCode} | ${time}ms\n`;

    fs.appendFile("history.txt", log, (err) => {
      if (err) console.error("Error writing to history.txt:", err.message);
    });
  });

  next();
};

module.exports = logger;
