
const nunjucks = require('nunjucks');

const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');

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

    const { Deploy, Lib, SourceTypes = ['docker','download','local'] } = userConfig.software[softwareComponentName];
    const { Artifact } = userConfig.software[Deploy];

    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
    const pidFile = `.${softwareComponentName}Pid`;
    
    runtimeConfiguration.addDependency(JavaPlugin.instance());

    const configFiles = runtimeConfiguration.getConfigFiles(Deploy);

    var optionsBuilderData = [];
    var availableTypesData = [];
    var cleanupSourceTypesData = [];
    var defaultTypeData = 'download';
    var dockerLibsToAdd = '';
    var downloadLibsToCopy = '';

    SourceTypes.forEach(s => {
      switch(s) {
        case 'docker':
          optionsBuilderData.push(`${softwareComponentName}:docker:[7|8|9] #start docker image tomcat:X and run this build within it`);
          availableTypesData.push({ typeName: 'docker', defaultVersion: '9' });
          cleanupSourceTypesData.push({
            name: 'docker',
            stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
          });
          if (!SourceTypes.find(e => e === 'download')) {
            defaultTypeData = 'docker';
          }
          if (Lib) {
            dockerLibsToAdd = Lib.map(lib => userConfig.software[lib].Artifact)
                .map(lib => lib.replace('$$TMP$$', 'localrun'))
                .map(lib => `  dockerAddLibRefs+=("-v $(pwd)/${lib}:/usr/local/tomcat/lib/$(basename ${lib})")`).join('\n');
          }
          
        break;
        case 'download':
          optionsBuilderData.push(`${softwareComponentName}:download:[7|8|9] #download tomcat version x and run this build within it, would respect -j`);
          availableTypesData.push({ typeName: 'download', defaultVersion: '9', code: downloadCode(typeSourceVarName) });
          cleanupSourceTypesData.push({
            name: 'download',
            stopCode: './localrun/apache-tomcat-$TOMCAT_VERSION/bin/shutdown.sh'
          });
          if (Lib) {
            downloadLibsToCopy = Lib.map(lib => userConfig.software[lib].Artifact)
                .map(lib => lib.replace('$$TMP$$', 'localrun'))
                .map(lib => `  cp ${lib} localrun/apache-tomcat-$TOMCAT_VERSION/lib/`).join('\n');
          }
          
        break;
        case 'local':
          optionsBuilderData.push(`${softwareComponentName}:local:/usr/lib/tomcat #reuse tomcat installation from /usr/lib/tomcat, does not start/stop this tomcat`);
          availableTypesData.push({ typeName: 'local', defaultVersion: '' });
          if (!SourceTypes.find(e => e === 'download') && !SourceTypes.find(e => e === 'docker')) {
            defaultTypeData = 'local';
          }          
        break;
        default:
          throw Error(`SourceType ${s} not supported for Tomcat`);
      }
    });

    optionsBuilder.addDetails('t', optionsBuilderData);

    runtimeConfiguration.setTail('apache catalina');

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: defaultTypeData, 
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
      Artifact,
      storeFileAndExportEnvVar: configFiles.map(f => f.storeFileAndExportEnvVar()).join('\n'),
      writeDockerConnectionLogic: configFiles.map(f => f.writeDockerConnectionLogic('dockerTomcatExtRef')).join('\n'),
      mountToDocker: configFiles.map(f => f.mountToDocker('/usr/local/tomcat/webapps')).join('\n')
    });

  }

}

module.exports = TomcatPlugin;
