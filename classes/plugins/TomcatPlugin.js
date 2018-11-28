
const nunjucks = require('nunjucks');

const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');
const BaseConfigFile = require('../core/configFile/BaseConfigFile');
const Strings = require('../core/Strings');

const BasePlugin = require('./BasePlugin');
const JavaPlugin = require('./JavaPlugin');


const downloadCode = typeSourceVarName => `# find latest tomcat version for $${typeSourceVarName}_VERSION
  if [ "$(uname)" == "Linux" ]; then
    GREP_PERL_MODE="-P"
  fi
  TOMCAT_BASE_URL="http://mirror.vorboss.net/apache/tomcat"
  TOMCAT_VERSION_PRE=$(curl -s "$TOMCAT_BASE_URL/tomcat-$${typeSourceVarName}_VERSION/"|grep -m1 -o $GREP_PERL_MODE "<a href=\\"v\\d*.\\d*.\\d*" || echo "__________9.0.10")
  TOMCAT_VERSION=\${TOMCAT_VERSION_PRE:10}
  TOMCAT_URL=$TOMCAT_BASE_URL/tomcat-$${typeSourceVarName}_VERSION/v$TOMCAT_VERSION/bin/apache-tomcat-$TOMCAT_VERSION.tar.gz`;

class TomcatPlugin extends BasePlugin {

  static instance() {
    return new TomcatPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);

    const { Name: systemName } = userConfig.config;
    const { Deploy, Lib, EnvVars = [], SourceTypes = ['docker','download','local'], DockerImage = 'tomcat', ExposedPort = '8080', DockerMemory } = userConfig.software[softwareComponentName];
    const { Artifact } = userConfig.software[Deploy];

    const defaultDockerVersion = ((userConfig.versions || {})[softwareComponentName] || {}).Docker || 'latest';
    const defaultDownloadVersion = ((userConfig.versions || {})[softwareComponentName] || {}).Download || '9';

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
          .map(lib => `  dockerAddLibRefs+=("-v $(pwd)/${lib}:/usr/local/tomcat/lib/$(basename ${lib})")`).join('\n');
    }
    
    // download      
    optionsBuilderData.push(`${softwareComponentName}:download:[7|8|9] #start fresh downloaded tomcat, default version ${defaultDownloadVersion} and respect -j`);
    availableTypesData.push({ typeName: 'download', defaultVersion: defaultDownloadVersion, code: downloadCode(typeSourceVarName) });
    cleanupSourceTypesData.push({
      name: 'download',
      stopCode: './localrun/apache-tomcat-$TOMCAT_VERSION/bin/shutdown.sh'
    });
    if (Lib) {
      downloadLibsToCopy = Lib.map(lib => userConfig.software[lib].Artifact)
          .map(lib => lib.replace('$$TMP$$', 'localrun'))
          .map(lib => `  cp ${lib} localrun/apache-tomcat-$TOMCAT_VERSION/lib/`).join('\n');
    }
          
    // local
    optionsBuilderData.push(`${softwareComponentName}:local:TOMCAT_HOME_PATH #reuse tomcat installation from TOMCAT_HOME_PATH, does not start/stop this tomcat`);
    availableTypesData.push({ typeName: 'local', defaultVersion: '' });

    optionsBuilder.addDetails(softwareComponentName, `download:${defaultDownloadVersion}`, optionsBuilderData);

    runtimeConfiguration.setTail('apache catalina', `http://localhost:${ExposedPort}/${deployPath}`);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'download', 
      availableTypes: availableTypesData
    });

    cleanupBuilder.add({
      pluginName: 'tomcat',
      componentName: softwareComponentName,
      sourceTypes: cleanupSourceTypesData
    });
    
    dependencycheckBuilder.add('curl --version 1>/dev/null');
        
    this.build = () => nunjucks.render('classes/plugins/TomcatPlugin.tmpl', {
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
      AllEnvVarsTomcat: 'export JAVA_OPTS="$JAVA_OPTS ' + EnvVars.map(p => `-D${p}`).join(' ') + '"',
      AllEnvVarsDocker: EnvVars.map(p => `-e ${p}`).join(' '),
      storeFileAndExportEnvVar: configFiles.map(f => f.storeFileAndExportEnvVar()).join('\n'),
      writeConfigFiles: configFiles.map(f => f.createFile()).join('\n'),
      writeDockerConnectionLogic: BaseConfigFile.writeDockerConnectionLogic(softwareComponentName, configFiles),
      mountToDocker: configFiles.map(f => f.mountToDocker('/usr/local/tomcat/webapps')).join('\n')
    });

  }

}

module.exports = TomcatPlugin;
