
class BufferedBuilder {

  constructor() {
    this.buffer = '';
  }

  init(userConfig) {
    this.userConfig = userConfig;
  }

  add(code) {
    if (Array.isArray(code)) {
      this.buffer += `\n${code.join('\n')}\n`;
    } else {
      this.buffer += `\n${code}\n`;
    }
  }

  build() {
    return `\n\n#####${this.constructor.name}\n\n${this.buffer}\n\n`;
  }

}

module.exports = BufferedBuilder;
