import EventHandler from './event-handler'

const EXECUTING_LINE_CLASS = 'active-line'
const FOCUS_LINE_CLASS = 'focus-line'

class EditorView extends EventHandler {
  constructor (wrapperElem, initialProgram = '') {
    super()

    super.declareEvent('apply-suggestion')

    if ((wrapperElem instanceof jQuery) === false) {
      throw new Error('expected argument to new EditorView() to be a jQuery object')
    }

    // HTML element that the CodeMirror instance is embedded within
    this.wrapperElem = wrapperElem

    // Create a new CodeMirror instance inside of the given wrapper
    this.editor = CodeMirror(this.wrapperElem[0], {
      mode: 'text/x-java',
      theme: 'neat',
      value: initialProgram,
      lineNumbers: true,
      indentUnit: 4,
      smartIndent: false,
      tabSize: 4,
      indentWithTabs: true,
      electricChars: false,
      gutters: ['gutter-focus', 'CodeMirror-linenumbers']
    })

    this.focusedLines = []

    // Line number of the line currently highlighted. Set to -1 if no line highlighted
    this.highlightedLine = -1 // NOTE: 0-based line count

    this.frozen = false

    this.editor.on('gutterClick', (cm, lineNum) => {
      if (this.frozen === false) {
        this.toggleLineFocus(lineNum)
      }
    })
  }

  getProgram () {
    return this.editor.getValue()
  }

  setProgram (newValue, clearHistory = false) {
    if (typeof newValue !== 'string') {
      throw new Error('expected 1st arg. of EditorView.setProgram() to be a string')
    }

    this.editor.setValue(newValue)

    // If "clearHistory" is set, this will reset the editor's undo history
    // so that it won't be possible to use the undo command to reverse
    // changes made by "setValue"
    if (clearHistory === true) {
      this.editor.clearHistory()
    }
  }

  freeze () {
    this.frozen = true
    this.editor.setOption('readOnly', 'nocursor')
  }

  unfreeze () {
    this.frozen = false
    this.editor.setOption('readOnly', false)
    this.clearHighlightedLine()
    this.editor.focus()
  }

  highlightLine (lineNum) {
    if (this.frozen === false) {
      throw new Error('cannot highlight line until editor is frozen')
    }

    // Convert lineNum from 1-based to 0-based
    lineNum--

    if (this.highlightedLine >= 0) {
      this.clearHighlightedLine()
    }

    const PADDING = 20 // pixels that should be in-view above & below the line

    this.editor.addLineClass(lineNum, 'gutter', EXECUTING_LINE_CLASS)
    this.editor.addLineClass(lineNum, 'background', EXECUTING_LINE_CLASS)
    this.editor.scrollIntoView({line: lineNum, ch: 0}, PADDING)
    this.highlightedLine = lineNum
  }

  clearHighlightedLine () {
    if (this.highlightedLine === -1) {
      return
    }

    this.editor.removeLineClass(this.highlightedLine, 'gutter', EXECUTING_LINE_CLASS)
    this.editor.removeLineClass(this.highlightedLine, 'background', EXECUTING_LINE_CLASS)
    this.highlightedLine = -1
  }

  toggleLineFocus (lineNum) {
    let lineInfo = this.editor.lineInfo(lineNum)
    let focusIndex = this.focusedLines.indexOf(lineNum)

    if (focusIndex > -1) {
      this.editor.removeLineClass(lineNum, 'gutter', FOCUS_LINE_CLASS)
      this.editor.removeLineClass(lineNum, 'background', FOCUS_LINE_CLASS)
      this.focusedLines.splice(focusIndex, 1)
    } else {
      this.editor.addLineClass(lineNum, 'gutter', FOCUS_LINE_CLASS)
      this.editor.addLineClass(lineNum, 'background', FOCUS_LINE_CLASS)
      this.focusedLines.push(lineNum)
    }
  }

  clearFocusedLines () {
    this.focusedLines.forEach((lineNum) => {
      this.toggleLineFocus(lineNum)
    })
  }

  getFocusedLines () {
    return this.focusedLines.map(lineNum => lineNum + 1)
  }

  makeSuggestion (raw) {
    let lines = raw.trim().split('\n')
    let suggestionRegex = /(\d+)\t(.*)/

    if (lines.length < 1 || lines[0] !== 'success' || suggestionRegex.test(lines[1]) === false) {
      console.error(`RAW SUGGESTION: ${raw}`)
      throw new Error('no suggestion')
    }

    // remove success tag
    lines.shift()

    for (let i = 0; i < lines.length; i++) {
      let match = lines[i].match(suggestionRegex)
      let lineNum = parseInt(match[1], 10) - 1
      let lineValue = match[2]
      lines[i] = { lineNum: lineNum, lineValue: lineValue }
    }

    createChangeWidget(this, lines)
  }
}

// Assumes `lineNum` is 0-based.
function createChangeWidget (edv, changes) {
  const OLD_LINE_CLASS = 'diff-old-line'
  const CHANGE_CLASS = 'diff-change'
  const widgets = changes.sort((a, b) => a.lineNum - b.lineNum).map((change, index) => {
    // Mark old line
    edv.editor.getDoc().addLineClass(change.lineNum, 'background', OLD_LINE_CLASS)

    // Add appropriate level of indentation to new line
    let oldLineValue = edv.editor.getLine(change.lineNum)
    let indentation = (oldLineValue.match(/^\s*/) || [''])[0].replace(/\t/g, '    ')
    change.lineValue = indentation + change.lineValue

    // Build widget
    const widgetElem = $('<div />').addClass('diff-widget')

    if (index === changes.length - 1) {
      widgetElem
        .append('<button class="cancel-change" title="Cancel Change">&#x2717; Don&rsquo;t change</button>')
        .append('<button class="accept-change" title="Accept Change">&#x2713; Make change</button>')

      widgetElem.find('.accept-change').on('click', () => {
        widgets.forEach(w => w.clear())
        changes.forEach((change) => {
          let oldLineValue = edv.editor.getLine(change.lineNum)
          edv.editor.getDoc().removeLineClass(change.lineNum, 'background', OLD_LINE_CLASS)
          edv.editor.replaceRange(
            change.lineValue,
            {line: change.lineNum, ch: 0},
            {line: change.lineNum, ch: oldLineValue.length}
          )
        })
        edv.trigger('apply-suggestion', [])
      })

      widgetElem.find('.cancel-change').on('click', () => {
        widgets.forEach(w => w.clear())
        edv.editor.getDoc().removeLineClass(change.lineNum, 'background', OLD_LINE_CLASS)
        changes.forEach((change) => {
          edv.editor.getDoc().removeLineClass(change.lineNum, 'background', OLD_LINE_CLASS)
        })
      })
    }

    widgetElem.append('<pre class="line">' + change.lineValue + '</pre>')
    return edv.editor.getDoc().addLineWidget(change.lineNum, widgetElem.get(0))
  })
}

export default EditorView
