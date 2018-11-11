
const Strings = require('../core/Strings');

class BaseBuilder {

  constructor(extClassName) {
    this._extClassName = extClassName;
  }

  get extClassName() {
    if (this._extClassName) {
      return this._extClassName;
    }
    return this.constructor.name;
  }

  init(userConfig, runtimeConfiguration) {
    this.userConfig = userConfig;
    this.runtimeConfiguration = runtimeConfiguration;
  }

  build() {
    const buildBuff = this.buildInternal();
    //if (!buildBuff) {
    //  return '';
    //}
    return `\n${Strings.headerPhase(this)}\n${buildBuff}\n\n`;
  }

  buildInternal() {
    return 'not implemented';
  }

}

module.exports = BaseBuilder;
