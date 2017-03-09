const fs        = require('fs')
const path      = require('path')
const url       = require('url')
const express   = require('express')
const httpProxy = require('express-http-proxy')
const morgan    = require('morgan')
const config    = require('./config.json')

function staticFile (endpoint, relative) {
  app.get(endpoint, (req, res) => {
    res.sendFile(path.resolve(__dirname, relative))
  })
}

function staticDir (endpoint, relative) {
  app.use(endpoint, express.static(path.resolve(__dirname, relative)))
}

function proxy (endpoint, urlObj) {
  app.use(endpoint, httpProxy(url.format(urlObj)))
}

// Configure server.
const port = process.env.PORT || 8080
const app = express()
const logFilename = path.join(__dirname, 'access.log')
const logFile = fs.createWriteStream(logFilename, { flags: 'a' })
app.use(morgan('common', { stream: logFile }))

// Create static routes.
staticFile('/', './views/index.html')
staticDir('/public', './dist')
staticDir('/assets', './assets')

// Create proxy endpoints.
proxy('/trace', config['trace-endpoint'])
proxy('/suggest', config['suggest-endpoint'])

app.listen(port)
