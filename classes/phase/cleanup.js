
const nunjucks = require('nunjucks');

const BaseBuilder = require('./BaseBuilder');

class CleanupBuilder extends BaseBuilder {

  constructor() {
    super('CleanupBuilder');
    this.componentsCode = [];
  }

  init(userConfig, runtimeConfiguration) {
  }

  add({ pluginName, componentName, sourceTypes }) {
    this.componentsCode.push({
      pluginName,
      componentName,
      sourceTypes
    });
  }

  buildInternal() {
    return nunjucks.render('classes/phase/cleanup.tmpl', { componentsCode: this.componentsCode });
  }

}

module.exports = new CleanupBuilder();
