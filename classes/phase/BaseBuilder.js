
const nunjucks = require('nunjucks');

const Strings = require('../core/Strings');

class BaseBuilder {

  constructor(extClassName) {
    this._extClassName = extClassName;
  }

  get extClassName() {
    if (this._extClassName === false) {
      return '';
    }
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
    if (!buildBuff) {
      return '';
    }
    return nunjucks.render('classes/phase/BaseBuilder.tmpl', {
      buildBuff,
      extClassName: this.extClassName
    });
  }

  buildInternal() {
    return 'not implemented';
  }

}

module.exports = BaseBuilder;
