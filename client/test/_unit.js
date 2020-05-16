
import glob from 'glob';

console.warn = function() {};

glob
  .sync('../src/**/*.test.js', { cwd: `${__dirname}/` })
  .map(filename => require(`./${filename}`))
