
class BufferedBuilder {

  constructor() {
    this.buffer = '';
  }

  init(userConfig) {
    this.userConfig = userConfig;
  }

  add(code) {
    this.buffer += code;
  }

  build() {
    return this.buffer;
  }

}

module.exports = BufferedBuilder;
