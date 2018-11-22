
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

    const { Name: systemName } = userConfig.config;
    const { Start, Node, EnvVars = [], ExposedPort = '3000', BeforeBuild = [], AfterBuild = [], DockerImage = 'node' } = userConfig.software[softwareComponentName];

    dependencycheckBuilder.add('node --version 1>/dev/null');
    dependencycheckBuilder.add('npm --version 1>/dev/null');

    optionsBuilder.addDetails(softwareComponentName, 'docker:10', [
      `${softwareComponentName}:local #reuse a local node installation`,
      `${softwareComponentName}:docker:[TAG] #start docker, default tag 10, uses image http://hub.docker.com/_/${DockerImage}`
    ]);

    runtimeConfiguration.setTail('nodejs', `http://localhost:${ExposedPort}`);

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

    const Build = Node && Node.Build ? Node.Build : 'npm i --save-prod';
    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);
    const NodeParam = Node ? Node.Param : '';
    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
    const pidFile = `.${softwareComponentName}Pid`;

    this.build = () => nunjucks.render('classes/plugins/NodePlugin.tmpl', {
      ...this.nunjucksObj(),
      Build,
      typeSourceVarName,
      Start,
      NodeParam,
      ExposedPort,
      configFiles,
      softwareComponentName,
      systemName,
      pidFile,
      BeforeBuild,
      AfterBuild,
      DockerImage,
      writeDockerConnectionLogic: configFiles.map(f => f.writeDockerConnectionLogic()).join('\n'),
      mountToDocker: configFiles.map(f => f.mountToDocker('/home/node/exec_env/server')).join('\n'),
      storeFileAndExportEnvVar: configFiles.map(f => f.storeFileAndExportEnvVar()).join('\n'),
      AllEnvVarsDocker: EnvVars.map(p => `-e ${p}`).join(' '),
      AllEnvVarsNode: EnvVars.map(p => `${p}`).join(' ')
    });

  }

}

module.exports = NodePlugin;

