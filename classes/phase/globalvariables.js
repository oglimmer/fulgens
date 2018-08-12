
class GlobalVariablesBuilder {

  constructor() {
    this.varNames = [];
  }

  init(userConfig) {
  }

  add(varName, defaultValue) {
    this.varNames.push({ varName, defaultValue });
  }

  build() {
    return this.varNames.map(e => `${e.varName}=${e.defaultValue};`).join('\n');
  }

}

module.exports = new GlobalVariablesBuilder();
