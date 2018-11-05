
const nunjucks = require('nunjucks');

const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');

const sourceTypeBuilder = require('../core/SourceType');

const BasePlugin = require('./BasePlugin');

class CouchdbPlugin extends BasePlugin {

  static instance() {
    return new CouchdbPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    const CouchDB = userConfig.software[softwareComponentName].CouchDB;

    dependencycheckBuilder.add('docker --version 1>/dev/null');
    
    optionsBuilder.addDetails('t', [
      `${softwareComponentName}:local #reuse a local, running CouchDB installation, does not start/stop this CouchDB`,
      `${softwareComponentName}:docker:[1.7|2] #start docker image couchdb:X`]);

    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'docker', 
      availableTypes: [
        { typeName: 'docker', defaultVersion: '1.7' },
        { typeName: 'local', defaultVersion: '' }
      ]
    });

    cleanupBuilder.add({
      pluginName: 'couchdb',
      componentName: softwareComponentName,
      sourceTypes: [{
        name: 'docker',
        stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
      }]
    });

    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
    const pidFile = `.${softwareComponentName}Pid`;
    const dcId = `dockerContainerID${softwareComponentName}`;

    this.build = () => nunjucks.render('classes/plugins/CouchdbPlugin.tmpl', {
      ...this.nunjucksObj(),
      typeSourceVarName,
      pidFile,
      dcId,
      softwareComponentName,
      couchDBs: Array.isArray(CouchDB) ? CouchDB : (CouchDB ? [CouchDB] : []),
      writeDockerConnectionLogic: configFiles.map(f => f.writeDockerConnectionLogic('dockerCouchdbExtRef')).join('\n'),
      makeDockerVolume: configFiles.map(f => f.makeDockerVolume()).join('\n'),
    });
  }

}

module.exports = CouchdbPlugin;
