
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

    const { Name: systemName } = userConfig.config;
    const { CouchDB, EnvVars = [], DockerImage = 'couchdb', ExposedPort = '5984' } = userConfig.software[softwareComponentName];

    const defaultVersion = '1.7';

    dependencycheckBuilder.add('docker --version 1>/dev/null');
    
    optionsBuilder.addDetails(softwareComponentName, 'docker:' + defaultVersion, [
      `${softwareComponentName}:local #reuse a local, running CouchDB installation, does not start/stop this CouchDB`,
      `${softwareComponentName}:docker:[TAG] #start docker, default tag ${defaultVersion}, uses image from http://hub.docker.com/_/${DockerImage}`]);

    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'docker', 
      availableTypes: [
        { typeName: 'docker', defaultVersion },
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
      DockerImage,
      softwareComponentName,
      systemName,
      ExposedPort,
      AllEnvVarsDocker: EnvVars.map(p => `-e ${p}`).join(' '),
      couchDBs: Array.isArray(CouchDB) ? CouchDB : (CouchDB ? [CouchDB] : []),
      writeDockerConnectionLogic: configFiles.map(f => f.writeDockerConnectionLogic()).join('\n'),
      mountToDocker: configFiles.map(f => f.mountToDocker()).join('\n'),
    });
  }

}

module.exports = CouchdbPlugin;
