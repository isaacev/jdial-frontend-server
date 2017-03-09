const fs     = require('fs')
const prompt = require('prompt')

const schema = {
  properties: {
    'trace-protocol': {
      description: 'trace.protocol',
      pattern: /^http(s)?\:$/,
      message: 'http: or https:',
      default: 'http:',
    },
    'trace-hostname': {
      description: 'trace.hostname',
      required: true,
    },
    'trace-port': {
      description: 'trace.port',
      pattern: /^\d{2,4}$/,
      message: '2 to 4 digits',
      default: 8080,
    },
    'suggest-protocol': {
      description: 'suggest.protocol',
      pattern: /^http(s)?\:$/,
      message: 'http: or https:',
      default: 'http:',
    },
    'suggest-hostname': {
      description: 'suggest.hostname',
      required: true,
    },
    'suggest-port': {
      description: 'suggest.port',
      pattern: /^\d{2,4}$/,
      message: '2 to 4 digits',
      default: 8080,
    },
  }
}

if (fs.existsSync('./config.json') === false) {
  console.log('ERROR: missing config.json')
  prompt.start()

  prompt.message = 'config.json'
  prompt.get(schema, (err, res) => {
    if (!res) {
      throw new Error('missing config.json data')
    }

    let config = {
      'trace-endpoint': {
        protocol: res['trace-protocol'],
        hostname: res['trace-hostname'],
        port: res['trace-port'],
      },
      'suggest-endpoint': {
        protocol: res['suggest-protocol'],
        hostname: res['suggest-hostname'],
        port: res['suggest-port'],
      },
    }

    fs.writeFileSync('./config.json', JSON.stringify(config))
    prompt.stop()
  })
}
