
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
      'node:local #reuse a local node installation',
      'node:docker:[6|8|10] #start docker image \\`node:X\\`'
    ]);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'local', 
      availableTypes: [
        { typeName: 'docker', defaultVersion: '10' },
        { typeName: 'local', defaultVersion: '' }
      ]
    });
 
    cleanupBuilder.add({
      componentName:'Node',
      sourceTypes: [{
        name: 'docker',
        stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
      }]
    });



    const Artifact = userConfig.software[softwareComponentName].Artifact;

    this.buildBuilder.add(`
      if [ "$SKIP_BUILD" != "YES" ]; then
        npm i --save-prod
      fi
    `);

    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);

    this.startBuilder.add(startDocker(Artifact, configFiles, softwareComponentName));
    this.startBuilder.add(startLocal(Artifact, configFiles, softwareComponentName));

  }

}

module.exports = NodePlugin;


const startDocker = (Artifact, configFiles, softwareComponentName) => `
if [ "$TYPE_SOURCE_NODE" == "docker" ]; then
  if [ -f .node ] && [ "$(<.node)" == "download" ]; then
    echo "node running but started from different source type"
    exit 1
  fi
  if [ ! -f ".node" ]; then
    ${configFiles.map(f => f.storeFileForDocker()).join('\n')}
    if [ -n "$VERBOSE" ]; then echo "docker run --rm -d $dockerCouchRef -p 1337:1337 ${configFiles.map(f => f.mountToDocker('/home/node/exec_env/server')).join('\n')}  -v $(pwd):/home/node/exec_env -w /home/node/exec_env node:$TYPE_SOURCE_NODE_VERSION ./${Artifact}"; fi
    dockerContainerID${softwareComponentName}=$(docker run --rm -d $dockerCouchRef -p 1337:1337 \\
        ${configFiles.map(f => f.mountToDocker('/home/node/exec_env/server')).join('\n')}  \\
        -v "$(pwd)":/home/node/exec_env -w /home/node/exec_env node:$TYPE_SOURCE_NODE_VERSION ./${Artifact})
    echo "$dockerContainerID${softwareComponentName}">.node
  else
    dockerContainerID${softwareComponentName}=$(<.node)
  fi
  tailCmd="docker logs -f $dockerContainerID${softwareComponentName}"
fi
`;

const startLocal = (Artifact, configFiles, softwareComponentName) => `
if [ "$TYPE_SOURCE_NODE" == "local" ]; then
  if [ -f .node ]; then
    echo "node running but started from different source type"
    exit 1
  fi
  ${configFiles.map(f => f.storeFileAndExportEnvVar()).join('\n')}
  ./${Artifact}
  echo "$dockerContainerID${softwareComponentName}">.node
fi
`;