
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
      if [ "$VERBOSE" == "YES" ]; then echo "DEFAULT: ${e.varName}=${e.defaultValue}"; fi
      ${e.varName}=${e.defaultValue}
    `).join('\n');
  }

}

module.exports = new GlobalVariablesBuilder();
