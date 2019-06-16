
const glob = require('glob')
const Router = require('express').Router

module.exports = () => glob
  .sync('**/*.js', { cwd: `${__dirname}/` })
  .map(filename => require(`./${filename}`))
  .filter(router => Object.getPrototypeOf(router) == Router)
  .reduce((rootRouter, router) => rootRouter.use(router), Router({ mergeParams: true }))

