
const BufferedBuilder = require('./BufferedBuilder');

class PrepareBuilder extends BufferedBuilder {

  buildInternal() {
    return `
mkdir -p localrun

` + super.buildInternal();
  }

}

module.exports = new PrepareBuilder();
