
const Strings = require('../core/Strings');
const BaseBuilder = require('./BaseBuilder');

class BufferedBuilder extends BaseBuilder {

  constructor() {
    super();
    this.buffer = '';
  }

  add(code) {
    if (Array.isArray(code)) {
      this.buffer += `\n${code.join('\n')}\n`;
    } else {
      this.buffer += `\n${code}\n`;
    }
  }

  buildInternal() {
    return this.buffer;
  }

}

module.exports = BufferedBuilder;
