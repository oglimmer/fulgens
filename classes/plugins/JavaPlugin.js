
const nunjucks = require('nunjucks');

const functionsBuilder = require('../phase/functions');
const prepareBuilder = require('../phase/prepare');
const optionsBuilder = require('../phase/options');
const cleanupBuilder = require('../phase/cleanup');
const sourceTypeBuilder = require('../core/SourceType');
const dependencycheckBuilder = require('../phase/dependencycheck');
const BaseConfigFile = require('../core/configFile/BaseConfigFile');
const Strings = require('../core/Strings');
const CEnvVars = require('../core/CEnvVars');

const BasePlugin = require('./BasePlugin');

var prepare = `
if [ "$(uname)" == "Darwin" ]; then 
  if [ -n "$JAVA_VERSION" ]; then
    export JAVA_HOME=$(/usr/libexec/java_home -v $JAVA_VERSION)
  fi
fi
`;

var functionBodyCheckJDKVersion = `
  # returns the JDK version.
  # 8 for 1.8.0_nn, 9 for 9-ea etc, and "no_java" for undetected
  # from https://stackoverflow.com/questions/7334754/correct-way-to-check-java-version-from-bash-script
  local result
  local java_cmd
  if [[ -n $(type -p java) ]]
  then
    java_cmd=java
  elif [[ (-n "$JAVA_HOME") && (-x "$JAVA_HOME/bin/java") ]]
  then
    java_cmd="$JAVA_HOME/bin/java"
  fi
  local IFS=$'\\n'
  # remove \\r for Cygwin
  local lines=$("$java_cmd" -Xms32M -Xmx32M -version 2>&1 | tr '\\r' '\\n')
  if [[ -z $java_cmd ]]
  then
    result=no_java
  else
    for line in $lines; do
      if [[ (-z $result) && ($line = *"version \\""*) ]]
      then
        local ver=$(echo $line | sed -e 's/.*version "\\(.*\\)"\\(.*\\)/\\1/; 1q')
        # on macOS, sed doesn't support '?'
        if [[ $ver = "1."* ]]
        then
          result=$(echo $ver | sed -e 's/1\\.\\([0-9]*\\)\\(.*\\)/\\1/; 1q')
        else
          result=$(echo $ver | sed -e 's/\\([0-9]*\\)\\(.*\\)/\\1/; 1q')
        fi
      fi
    done
  fi
  echo "$result"
`;

var onceOnlyDone = false;

class JavaPlugin extends BasePlugin {

  static instance() {
    return new JavaPlugin();
  }

  static addAsDependency() {
    if(!onceOnlyDone) {
      optionsBuilder.add('j', 'version', 'JAVA_VERSION',
        `macOS only: set/overwrite JAVA_HOME to a specific locally installed version, use format from/for: /usr/libexec/java_home [-V]`);
      prepareBuilder.add(prepare);
      functionsBuilder.add('jdk_version', functionBodyCheckJDKVersion);
      dependencycheckBuilder.add('java -version 2>/dev/null');
      onceOnlyDone = true;
    }    
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    const { Name: systemName, JavaVersions } = userConfig.config;
    const { Start, ExposedPort, EnvVars = [], DockerImage = 'openjdk', DockerMemory } = userConfig.software[softwareComponentName];
    const { Artifact } = userConfig.software[Start];
    const ArtifactRpld = Artifact.replace('$$TMP$$', 'localrun');

    const defaultVersion = ((userConfig.versions || {})[softwareComponentName] || {}).Docker || 'latest';

    JavaPlugin.addAsDependency();

    optionsBuilder.addDetails(softwareComponentName, 'docker:' + defaultVersion, [
      `${softwareComponentName}:local #start a local java program`,
      `${softwareComponentName}:docker:[TAG] #start inside docker, default tag ${defaultVersion}, uses image ${Strings.dockerLink(DockerImage)}`
    ]);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'local', 
      availableTypes: [
        { typeName: 'local', defaultVersion: '' },
        { typeName: 'docker', defaultVersion }
      ]
    });

    const pid = `javaPID${softwareComponentName}`;
    const dcId = `dockerContainerID${softwareComponentName}`;

    cleanupBuilder.add({
      pluginName: 'java',
      componentName: softwareComponentName,
      sourceTypes: [{
        name: 'local',
        stopCode: 'kill $' + pid
      }, {
        name: 'docker',
        stopCode: 'docker rm -f $' + dcId
      }]
    });

    const configFiles = runtimeConfiguration.getConfigFiles(Start);
    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
    const pidFile = `.${softwareComponentName}Pid`;

    const envVars = new CEnvVars(EnvVars);
    const mountToDocker = configFiles.map(f => f.mountToDocker(envVars)).join(' ');

    this.build = () => nunjucks.render('classes/plugins/JavaPlugin.tmpl', {
      ...this.nunjucksObj(),
      typeSourceVarName,
      ArtifactRpld,
      pidFile,
      softwareComponentName,
      systemName,
      ExposedPort,
      dcId,
      pid,
      DockerImage,
      DockerMemory,
      writeConfigFiles: configFiles.map(f => f.createFile()).join('\n'),
      writeDockerConnectionLogic: BaseConfigFile.writeDockerConnectionLogic(configFiles),
      mountToDocker,
      AllEnvVarsDocker: envVars.toDocker(),
      AllEnvVarsShell: envVars.toShell()
    });
  }
}

module.exports = JavaPlugin;
