import Storage from './storage'

const devtoolsPanel = jQuery('#devtools-view')
const devtoolsInputs = {
  settingSingleLine: devtoolsPanel.find('#devtools-single-line')
}
const devtoolsOutputs = {
  fullTrace: devtoolsPanel.find('#devtools-trace-json'),
  point: devtoolsPanel.find('#devtools-mod-trace-json'),
  index: devtoolsPanel.find('#devtools-mod-trace-index')
}

devtoolsPanel.find('.close-devtools').on('click', () => {
  DevtoolsView.hidePanel()
})

devtoolsPanel.find('#devtools-save-settings').on('click', () => {
  DevtoolsView.saveSettings()
})

$(() => {
  DevtoolsView.getSettings((oldSettings) => {
    console.log(oldSettings)
    if (oldSettings && oldSettings.singleLine === true) {
      devtoolsInputs.settingSingleLine.prop('checked', true)
    }
  })
})

// Used for consistent JSON styling
function stringifyJSON (json) {
  return JSON.stringify(json, null, '  ')
}

class DevtoolsView {
  static initializeClipboard () {
    new Clipboard('button[data-clipboard-target]') // eslint-disable-line no-new
  }

  static saveSettings () {
    let newSettings = {
      singleLine: devtoolsInputs.settingSingleLine.prop('checked')
    }

    Storage.setSettings(newSettings, (err) => {
      if (err === null) {
        console.log('saved settings')
      } else {
        console.error(err)
      }
    })
  }

  static getSettings (cb) {
    Storage.getSettings((err, oldSettings) => {
      if (err != null) {
        console.error(err)
      } else if (oldSettings == null) {
        cb({})
      } else {
        cb(oldSettings)
      }
    })
  }

  static setWholeTrace (trace) {
    jQuery(devtoolsOutputs.fullTrace).val(stringifyJSON(trace))
  }

  static setModifiedTracePoint (point, index) {
    devtoolsOutputs.point.val(stringifyJSON(point))
    devtoolsOutputs.index.val(index)
  }

  static clearTraceData () {
    devtoolsOutputs.fullTrace.val('')
    devtoolsOutputs.point.val('')
    devtoolsOutputs.index.val('')
  }

  static showPanel () {
    devtoolsPanel.addClass('visible')
  }

  static hidePanel () {
    devtoolsPanel.removeClass('visible')
  }
}

export default DevtoolsView
