
const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');

const BasePlugin = require('./BasePlugin');

class NodePlugin extends BasePlugin {

  static instance() {
    return new NodePlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    dependencycheckBuilder.add('node --version 1>/dev/null');
    dependencycheckBuilder.add('npm --version 1>/dev/null');

    const Artifact = userConfig.software[softwareComponentName].Artifact;

    this.buildBuilder.add(`
      if [ "$SKIP_BUILD" != "YES" ]; then
        npm i --save-prod
      fi
    `);

    this.startBuilder.add(`
      ./${Artifact}
    `);

  }

}

module.exports = NodePlugin;
