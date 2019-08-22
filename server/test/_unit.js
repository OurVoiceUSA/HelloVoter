
import glob from 'glob';

console.warn = function() {};

glob
  .sync('../app/**/*.test.js', { cwd: `${__dirname}/` })
  .map(filename => require(`./${filename}`))
