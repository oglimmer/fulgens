
const BufferedBuilder = require('./BufferedBuilder');

class DependencycheckBuilder extends BufferedBuilder {

  constructor() {
    super();
    this.components = {};
  }

  add(code) {
    this.components[code] = true;
  }

  build() {
    var buffer = '\n\n#Check for Dependencies\n';
    for (var comp in this.components) {
      buffer += comp + " || exit 1; \n";
    }
    return buffer + '\n\n\n';
  }

}

module.exports = new DependencycheckBuilder();
