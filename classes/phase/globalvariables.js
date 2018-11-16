
const BaseBuilder = require('./BaseBuilder');

class GlobalVariablesBuilder extends BaseBuilder {

  constructor() {
    super('GlobalVariablesBuilder');
    this.varNames = [];
  }

  init(userConfig, runtimeConfiguration) {
  }

  add(varName, defaultValue) {
    this.varNames.push({ varName, defaultValue });
  }

  buildInternal() {
    return this.varNames.map(e => `
      verbosePrint "DEFAULT: ${e.varName}=${e.defaultValue}"
      ${e.varName}=${e.defaultValue}
    `).join('\n');
  }

}

module.exports = new GlobalVariablesBuilder();
