
const BufferedBuilder = require('./BufferedBuilder');

class DependencycheckBuilder extends BufferedBuilder {

  constructor() {
    super();
    this.components = {};
  }

  add(code) {
    this.components[code] = true;
  }

  buildInternal() {
    var buffer = '';
    for (var comp in this.components) {
      buffer += comp + " || exit 1; \n";
    }
    return buffer;
  }

}

module.exports = new DependencycheckBuilder();
