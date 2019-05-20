
const nunjucks = require('nunjucks');

const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');
const BaseConfigFile = require('../core/configFile/BaseConfigFile');
const Strings = require('../core/Strings');
const CEnvVars = require('../core/CEnvVars');

const BasePlugin = require('./BasePlugin');
const JavaPlugin = require('./JavaPlugin');


const downloadCode = typeSourceVarName => `# find latest tomee version for $${typeSourceVarName}_VERSION
  TOMEE_BASE_URL="https://www-eu.apache.org/dist/tomee"  
  if [ "$${typeSourceVarName}_VERSION" == "1" ]; then
    TOMEE_VERSION="1.7.5"
  elif [ "$${typeSourceVarName}_VERSION" == "7" ]; then
    TOMEE_VERSION="7.1.0"
  elif [ "$${typeSourceVarName}_VERSION" == "8" ]; then
    TOMEE_VERSION="8.0.0-M2"
  else
    echo "Illegal Tomee version: $${typeSourceVarName}_VERSION"
    exit 1
  fi
  TOMEE_URL=$TOMEE_BASE_URL/tomee-$TOMEE_VERSION/apache-tomee-$TOMEE_VERSION-webprofile.tar.gz`;

class TomeePlugin extends BasePlugin {

  static instance() {
    return new TomeePlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    const { Name: systemName } = userConfig.config;
    const { Deploy, Lib, EnvVars = [], SourceTypes = ['docker','download','local'], DockerImage = 'tomee', ExposedPort = '8080', DockerMemory } = userConfig.software[softwareComponentName];
    const { Artifact } = userConfig.software[Deploy];

    const defaultDockerVersion = ((userConfig.versions || {})[softwareComponentName] || {}).Docker || 'latest';
    const defaultDownloadVersion = ((userConfig.versions || {})[softwareComponentName] || {}).Download || '8';

    var deployPath = Artifact.substring(Artifact.lastIndexOf('/') + 1, Artifact.length - 4);
    if (deployPath.indexOf('##') > -1) {
      deployPath = deployPath.substring(0, deployPath.indexOf('#'));
    }

    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
    const pidFile = `.${softwareComponentName}Pid`;
    
    JavaPlugin.addAsDependency();

    const configFiles = [...runtimeConfiguration.getConfigFiles(Deploy), ...runtimeConfiguration.getConfigFiles(softwareComponentName)];

    var optionsBuilderData = [];
    var availableTypesData = [];
    var cleanupSourceTypesData = [];
    var dockerLibsToAdd = '';
    var downloadLibsToCopy = '';

    // docker
    optionsBuilderData.push(`${softwareComponentName}:docker:[TAG] #start docker, default tag ${defaultDockerVersion}, uses image ${Strings.dockerLink(DockerImage)}`);
    availableTypesData.push({ typeName: 'docker', defaultVersion: defaultDockerVersion });
    cleanupSourceTypesData.push({
      name: 'docker',
      stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
    });
    if (Lib) {
      dockerLibsToAdd = Lib.map(lib => userConfig.software[lib].Artifact)
          .map(lib => lib.replace('$$TMP$$', 'localrun'))
          .map(lib => `  dockerAddLibRefs+=("-v $(pwd)/${lib}:/usr/local/tomee/lib/$(basename ${lib})")`).join('\n');
    }
    
    // download      
    optionsBuilderData.push(`${softwareComponentName}:download:[1|7|8] #start fresh downloaded tomee, default version ${defaultDownloadVersion} and respect -j`);
    availableTypesData.push({ typeName: 'download', defaultVersion: defaultDownloadVersion, code: downloadCode(typeSourceVarName) });
    cleanupSourceTypesData.push({
      name: 'download',
      stopCode: './localrun/apache-tomee-webprofile-$TOMEE_VERSION/bin/shutdown.sh'
    });
    if (Lib) {
      downloadLibsToCopy = Lib.map(lib => userConfig.software[lib].Artifact)
          .map(lib => lib.replace('$$TMP$$', 'localrun'))
          .map(lib => `  cp ${lib} localrun/apache-tomee-webprofile-$TOMEE_VERSION/lib/`).join('\n');
    }
          
    // local
    optionsBuilderData.push(`${softwareComponentName}:local:TOMEE_HOME_PATH #reuse tomee installation from TOMEE_HOME_PATH, does not start/stop this tomee`);
    availableTypesData.push({ typeName: 'local', defaultVersion: '' });

    optionsBuilder.addDetails(softwareComponentName, `download:${defaultDownloadVersion}`, optionsBuilderData);

    runtimeConfiguration.setTail('apache catalina', `http://localhost:${ExposedPort}/${deployPath}`);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'download', 
      availableTypes: availableTypesData
    });

    cleanupBuilder.add({
      pluginName: 'tomee',
      componentName: softwareComponentName,
      sourceTypes: cleanupSourceTypesData
    });
    
    dependencycheckBuilder.add('curl --version 1>/dev/null');
    
    const envVars = new CEnvVars(softwareComponentName, EnvVars);
    const mountToDocker = configFiles.map(f => f.mountToDocker(envVars)).join('\n');

    this.build = () => nunjucks.render('classes/plugins/TomeePlugin.tmpl', {
      ...this.nunjucksObj(),
      dockerLibsToAdd,
      downloadLibsToCopy,
      typeSourceVarName,
      pidFile,
      softwareComponentName,
      systemName,
      Artifact,
      DockerImage,
      ExposedPort,
      DockerMemory,
      AllEnvVarsTomee: envVars.toShellExportJavaOpts(),
      AllEnvVarsDocker: envVars.toDocker(),
      storeFileAndExportEnvVar: configFiles.map(f => f.storeFileAndExportEnvVar()).join('\n'),
      writeConfigFiles: configFiles.map(f => f.createFile()).join('\n'),
      writeDockerConnectionLogic: BaseConfigFile.writeDockerConnectionLogic(configFiles, envVars),
      mountToDocker
    });

  }

}

module.exports = TomeePlugin;
