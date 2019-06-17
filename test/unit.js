
const glob = require('glob');

glob
  .sync('../app/**/*.test.js', { cwd: `${__dirname}/` })
  .map(filename => {
    console.log(filename);
    require(`./${filename}`);
  });

