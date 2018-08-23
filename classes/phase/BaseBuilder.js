
const Strings = require('../core/Strings');

class BaseBuilder {

  init(userConfig, runtimeConfiguration) {
    this.userConfig = userConfig;
    this.runtimeConfiguration = runtimeConfiguration;
  }

  build() {
    return `\n${Strings.headerPhase(this)}\n${this.buildInternal()}\n\n`;
  }

  buildInternal() {
    return 'not implemented';
  }

}

module.exports = BaseBuilder;
