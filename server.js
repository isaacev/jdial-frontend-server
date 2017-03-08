const { resolve } = require('path')
const express     = require('express')
const config      = require('./config.json')

function staticFile (app, endpoint, relative) {
  app.get(endpoint, (req, res) => {
    res.sendFile(resolve(__dirname, relative))
  })
}

function staticDir (app, endpoint, relative) {
  app.use(endpoint, express.static(resolve(__dirname, relative)))
}

const port = process.env.PORT || 8080
const app = express()

staticFile('/', './views/index.html')
staticDir('/public', './dist')
staticDir('/assets', './assets')

app.post('/trace', (req, res) => {
  let proxReq = http.request({
    host: config.trace_host,
    port: config.trace_port,
    path: config.trace_path,
    method: config.trace_method,
    headers: req.headers,
  }, (proxRes) => {
    proxRes.setEncoding('utf8')
    proxRes.on('data', (chunk) => { res.write(chunk) })
    proxRes.on('close', () => {
      res.writeHead(proxRes.statusCode)
      res.end()
    })

    proxRes.on('end', () => {
      res.writeHead(proxRes.statusCode);
      res.end();
    })
  }).on('error', function(err) {
    res.writeHead(500)
    res.end()
  })

  proxReq.end()
})

app.listen(port)
