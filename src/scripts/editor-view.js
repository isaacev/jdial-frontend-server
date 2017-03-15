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
    let matches = raw.match(/\{([^\n]*)\}/)

    if (matches === null || (matches[1] && matches[1].length === 0)) {
      console.error(`RAW SUGGESTION: ${raw}`)
      throw new Error('no suggestion')
    }

    let match = matches[1]

    // TODO: only looks at first suggestion currently
    match.split(',')
    .filter((p, i) => i === 0)
    .forEach((rawPair) => {
      let pair = rawPair.split('=')

      if (pair.length !== 2) {
        throw new Error(`no pairs: ${match}`)
      }

      let line = parseInt(pair[0], 10)
      let value = parseInt(pair[1], 10)

      if (isNaN(line)) {
        throw new Error(`line is NaN: ${match}`)
      }

      if (isNaN(value)) {
        throw new Error(`value is NaN: ${match}`)
      }

      /*
      // Add red class to original line.
      this.editor.getDoc().addLineClass(line - 1, 'background', 'diff-old-line')

      // Create line widget with updated, green line.
      let originalLine = this.editor.getLine(line - 1)
      let modifiedLine = originalLine.replace(/\b\d+\b/,
        '<span class="change">' + value.toString() + '</span>')
      let widgetElem = $('<div />')
        .addClass('diff-widget')
        .append('<pre class="line">' + modifiedLine + '</pre>')
        .append('<button class="accept-change">Accept</button>')
        .append('<button class="cancel-change">Cancel</button>')

      widgetElem.find('.accept-change').on('click', () => {
        this.editor.getDoc().removeLineClass(line - 1, 'background', 'old-line')
        widget.clear()
        this.editor.replaceRange(
          modifiedLine,
          {line: line - 1, ch: 0},
          {line: line - 1, ch: originalLine.length}
        )
        this.trigger('apply-suggestion', [])
      })

      widgetElem.find('.cancel-change').on('click', () => {
        widget.clear()
        this.editor.getDoc().removeLineClass(line - 1, 'background', 'old-line')
      })

      let widget = this.editor.getDoc().addLineWidget(line - 1, widgetElem.get(0))
      */

      createChangeWidget(this, line - 1, value)
    })
  }
}

// Assumes `lineNum` is 0-based.
function createChangeWidget (edv, lineNum, newVal) {
  const OLD_LINE_CLASS = 'diff-old-line'
  const CHANGE_CLASS = 'diff-change'
  const originalLine = edv.editor.getLine(lineNum)
  const changeMatch = originalLine.match(/\b\d+\b/)
  const styledDiff = `<span class="diff-change">${newVal.toString()}</span>`
  const styledModifiedLine = originalLine.replace(/\b\d+\b/, styledDiff)
  const modifiedLine = originalLine.replace(/\b\d+\b/, newVal.toString())

  // Mark old line.
  edv.editor.getDoc().addLineClass(lineNum, 'background', OLD_LINE_CLASS)
  const marker = edv.editor.getDoc().markText(
    { line: lineNum, ch: changeMatch.index},
    { line: lineNum, ch: changeMatch.index + changeMatch[0].length },
    { className: CHANGE_CLASS },
  )

  // Build widget.
  const widgetElem = $('<div />')
    .addClass('diff-widget')
    .append('<button class="cancel-change" title="Cancel Change">&#x2717; Don&rsquo;t change</button>')
    .append('<button class="accept-change" title="Accept Change">&#x2713; Make change</button>')
    .append('<pre class="line">' + styledModifiedLine + '</pre>')

  const widget = edv.editor.getDoc().addLineWidget(lineNum, widgetElem.get(0))

  widgetElem.find('.accept-change').on('click', () => {
    widget.clear()
    marker.clear()

    edv.editor.getDoc().removeLineClass(lineNum, 'background', OLD_LINE_CLASS)
    edv.editor
    edv.editor.replaceRange(
      modifiedLine,
      {line: lineNum, ch: 0},
      {line: lineNum, ch: originalLine.length}
    )
    edv.trigger('apply-suggestion', [])
  })

  widgetElem.find('.cancel-change').on('click', () => {
    widget.clear()
    marker.clear()

    edv.editor.getDoc().removeLineClass(lineNum, 'background', OLD_LINE_CLASS)
  })
}

export default EditorView
