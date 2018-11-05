
const nunjucks = require('nunjucks');

const globalVariables = require('../phase/globalvariables');

class SourceTypeBuilder {

  add(plugin, { componentName, defaultType, availableTypes }) {
    // availableTypes : array of { typeName, defaultVersion, code }

    const componentNameUpper = componentName.toUpperCase();
    const componentNameLower = componentName.toLowerCase();

    globalVariables.add(`TYPE_SOURCE_${componentNameUpper}`, defaultType);

    plugin.preparecompBuilder.add(nunjucks.render('classes/core/SourceType.tmpl', {
      componentNameLower,
      componentNameUpper,
      availableTypes  
    }));
    
  }

}

module.exports = new SourceTypeBuilder();
