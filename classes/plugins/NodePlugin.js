
const nunjucks = require('nunjucks');

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

    optionsBuilder.addDetails('t', [
      `${softwareComponentName}:local #reuse a local node installation`,
      `${softwareComponentName}:docker:[6|8|10] #start docker image node:X`
    ]);

    runtimeConfiguration.setTail('nodejs');

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'local', 
      availableTypes: [
        { typeName: 'docker', defaultVersion: '10' },
        { typeName: 'local', defaultVersion: '' }
      ]
    });
 
    cleanupBuilder.add({
      pluginName: 'node',
      componentName: softwareComponentName,
      sourceTypes: [{
        name: 'docker',
        stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
      }, {
        name: 'local',
        stopCode: `ps -p $processId${softwareComponentName} >/dev/null && kill $processId${softwareComponentName}`
      }]
    });

    const { Artifact, Node, EnvVars = [], ExposedPort = '3000' } = userConfig.software[softwareComponentName];
    const Build = Node && Node.Build ? Node.Build : 'npm i --save-prod';
    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);
    const NodeParam = Node ? Node.Param : '';
    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
    const pidFile = `.${softwareComponentName}Pid`;

    this.build = () => nunjucks.render('classes/plugins/NodePlugin.tmpl', {
      ...this.nunjucksObj(),
      Build,
      typeSourceVarName,
      Artifact,
      NodeParam,
      ExposedPort,
      configFiles,
      softwareComponentName,
      pidFile,
      writeDockerConnectionLogic: configFiles.map(f => f.writeDockerConnectionLogic('dockerNodeExtRef')).join('\n'),
      mountToDocker: configFiles.map(f => f.mountToDocker('/home/node/exec_env/server')).join('\n'),
      storeFileAndExportEnvVar: configFiles.map(f => f.storeFileAndExportEnvVar()).join('\n'),
      AllEnvVarsDocker: EnvVars.map(p => `-e ${p}`).join(' '),
      AllEnvVarsNode: EnvVars.map(p => `${p}`).join(' ')
    });

  }

}

module.exports = NodePlugin;

