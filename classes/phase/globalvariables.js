
const BaseBuilder = require('./BaseBuilder');

class GlobalVariablesBuilder extends BaseBuilder {

  constructor() {
    super();
    this.varNames = [];
  }

  init(userConfig, runtimeConfiguration) {
  }

  add(varName, defaultValue) {
    this.varNames.push({ varName, defaultValue });
  }

  buildInternal() {
    return this.varNames.map(e => `${e.varName}=${e.defaultValue}`).join('\n');
  }

}

module.exports = new GlobalVariablesBuilder();
