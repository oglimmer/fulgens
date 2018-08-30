
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

    this.buildBuilder.add(`
      f_build() {
        if [ "$VERBOSE" == "YES" ]; then echo "npm i --save-prod"; fi
        ${Build}
      }
      if [ "$SKIP_BUILD" != "YES" ]; then
        if [ -n "$CLEAN" ]; then
          if [ "$VERBOSE" == "YES" ]; then echo "rm -rf node_modules/"; fi
          rm -rf node_modules/
        fi
        f_build        
      fi
    `);

    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);
    const NodeParam = Node ? Node.Param : '';

    this.startBuilder.add(startDocker(Artifact, NodeParam, EnvVars, ExposedPort, configFiles, softwareComponentName));
    this.startBuilder.add(startLocal(Artifact, NodeParam, EnvVars, configFiles, softwareComponentName));

  }

}

module.exports = NodePlugin;


const startDocker = (Artifact, NodeParam, EnvVars, ExposedPort, configFiles, softwareComponentName) => {
  const pidFile = `.${softwareComponentName}Pid`;
  return `
if [ "$TYPE_SOURCE_${softwareComponentName.toUpperCase()}" == "docker" ]; then
  #if [ -f "${pidFile}" ] && [ "$(<${pidFile})" == "download" ]; then
  #  echo "node running but started from different source type"
  #  exit 1
  #fi
  if [ ! -f "${pidFile}" ]; then
    ${configFiles.map(f => f.storeFileForDocker('dockerNodeExtRef')).join('\n')}
    if [ -n "$VERBOSE" ]; then echo ".."; fi
    dockerContainerID${softwareComponentName}=$(docker run --rm -d $dockerNodeExtRef -p ${ExposedPort}:${ExposedPort} \\
        ${configFiles.map(f => f.mountToDocker('/home/node/exec_env/server')).join('\n')}  \\
        ${EnvVars.map(p => `-e ${p}`).join(' ')} \\
        -v "$(pwd)":/home/node/exec_env -w /home/node/exec_env node:$TYPE_SOURCE_${softwareComponentName.toUpperCase()}_VERSION node ${NodeParam} ./${Artifact})
    echo "$dockerContainerID${softwareComponentName}">${pidFile}
  else
    dockerContainerID${softwareComponentName}=$(<${pidFile})
  fi
  tailCmd="docker logs -f $dockerContainerID${softwareComponentName}"
fi
`
};

const startLocal = (Artifact, NodeParam, EnvVars, configFiles, softwareComponentName) => {
  const pidFile = `.${softwareComponentName}Pid`;
  return `
if [ "$TYPE_SOURCE_${softwareComponentName.toUpperCase()}" == "local" ]; then
  #if [ -f "${pidFile}" ]; then
  #  echo "node running but started from different source type"
  #  exit 1
  #fi
  if [ ! -f "${pidFile}" ]; then
      cat > localrun/noint.js <<EOF
      process.on( "SIGINT", function() {} );
      require('../${Artifact}');
EOF
    ${configFiles.map(f => f.storeFileAndExportEnvVar()).join('\n')}
    ${EnvVars.map(p => `${p}`).join(' ')} node ${NodeParam} localrun/noint.js >localrun/noint.out 2>&1 & 
    processId${softwareComponentName}=$!
    echo "$processId${softwareComponentName}">${pidFile}
  else
    processId${softwareComponentName}=$(<${pidFile})
  fi
  tailCmd="tail -f localrun/noint.out"
fi
`
};
