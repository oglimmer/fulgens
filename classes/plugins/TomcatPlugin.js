
const cleanupBuilder = require('../phase/cleanup');
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');

const BasePlugin = require('./BasePlugin');
const JavaPlugin = require('./JavaPlugin');

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
    var prestartBuilderData = [];

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
          prestartBuilderData.push(`
            if [ "$${typeSourceVarName}" == "docker" ]; then
              mkdir -p localrun/webapps
              targetPath=localrun/webapps/
            fi
          `);
          if (Lib) {
            this.prestartBuilder.add(`
              dockerAddLibRefs=()
              if [ "$${typeSourceVarName}" == "docker" ]; then
              ` + Lib.map(lib => userConfig.software[lib].Artifact)
                .map(lib => lib.replace('$$TMP$$', 'localrun'))
                .map(lib => `  dockerAddLibRefs+=("-v $(pwd)/${lib}:/usr/local/tomcat/lib/$(basename ${lib})")`).join('\n')
              + '\nfi');
          }
          this.startBuilder.add(startDocker(typeSourceVarName, pidFile, configFiles, softwareComponentName));
        break;
        case 'download':
          optionsBuilderData.push(`${softwareComponentName}:download:[7|8|9] #download tomcat version x and run this build within it, would respect -j`);
          availableTypesData.push({ typeName: 'download', defaultVersion: '9', code: downloadCode(typeSourceVarName) });
          cleanupSourceTypesData.push({
            name: 'download',
            stopCode: './localrun/apache-tomcat-$TOMCAT_VERSION/bin/shutdown.sh'
          });
          prestartBuilderData.push(`
            if [ "$${typeSourceVarName}" == "download" ]; then
              targetPath=localrun/apache-tomcat-$TOMCAT_VERSION/webapps/
            fi
          `);
          if (Lib) {
            this.prestartBuilder.add(`if [ "$${typeSourceVarName}" == "download" ]; then\n` 
              + Lib.map(lib => userConfig.software[lib].Artifact)
                .map(lib => lib.replace('$$TMP$$', 'localrun'))
                .map(lib => `  cp ${lib} localrun/apache-tomcat-$TOMCAT_VERSION/lib/`).join('\n')
              + '\nfi');
          }
          this.getsourceBuilder.add(getSource(typeSourceVarName, pidFile));
          this.startBuilder.add(startDownload(typeSourceVarName, pidFile, configFiles));
        break;
        case 'local':
          optionsBuilderData.push(`${softwareComponentName}:local:/usr/lib/tomcat #reuse tomcat installation from /usr/lib/tomcat, does not start/stop this tomcat`);
          availableTypesData.push({ typeName: 'local', defaultVersion: '' });
          if (!SourceTypes.find(e => e === 'download') && !SourceTypes.find(e => e === 'docker')) {
            defaultTypeData = 'local';
          }
          prestartBuilderData.push(`
            if [ "$${typeSourceVarName}" == "local" ]; then
              targetPath=$${typeSourceVarName}_PATH/webapps/
            fi
          `);
          this.startBuilder.add(startLocal(typeSourceVarName, pidFile));
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
        
    this.prestartBuilder.add(`
    ${prestartBuilderData.join('\n')}
    f_deploy() {
      cp ${Artifact} $targetPath
    }
    f_deploy
    `);

  }

}

module.exports = TomcatPlugin;

const startDownload = (typeSourceVarName, pidFile, configFiles) => `
if [ "$${typeSourceVarName}" == "download" ]; then
  # start tomcat
  if [ ! -f "${pidFile}" ]; then
    ${configFiles.map(f => f.storeFileAndExportEnvVar()).join('\n')}
    ./localrun/apache-tomcat-$TOMCAT_VERSION/bin/startup.sh
    echo "download">${pidFile}
  fi
  tailCmd="tail -f ./localrun/apache-tomcat-$TOMCAT_VERSION/logs/catalina.out"
fi
`;

const startDocker = (typeSourceVarName, pidFile, configFiles, softwareComponentName) => `
if [ "$${typeSourceVarName}" == "docker" ]; then
  if [ -f "${pidFile}" ] && [ "$(<${pidFile})" == "download" ]; then
    echo "Tomcat running but started from different source type"
    exit 1
  fi
  if [ ! -f "${pidFile}" ]; then
    ${configFiles.map(f => f.storeFileForDocker('dockerTomcatExtRef')).join('\n')}
    dockerContainerID${softwareComponentName}=$(docker run --rm -d $dockerTomcatExtRef \${dockerAddLibRefs[@]} -p 8080:8080 \\
        ${configFiles.map(f => f.mountToDocker('/usr/local/tomcat/webapps')).join('\n')} \\
        -v "$(pwd)/localrun/webapps":/usr/local/tomcat/webapps tomcat:$${typeSourceVarName}_VERSION)
    echo "$dockerContainerID${softwareComponentName}">${pidFile}
  else
    dockerContainerID${softwareComponentName}=$(<${pidFile})
  fi
  tailCmd="docker logs -f $dockerContainerID${softwareComponentName}"
fi
`;

const startLocal = (typeSourceVarName, pidFile) => `
if [ "$${typeSourceVarName}" == "local" ]; then
  if [ -f "${pidFile}" ]; then
    echo "Tomcat running but started from different source type"
    exit 1
  fi
  tailCmd="tail -f $${typeSourceVarName}_PATH/logs/catalina.out"
fi
`;

const downloadCode = typeSourceVarName => `# find latest tomcat version for $${typeSourceVarName}_VERSION
  if [ "$(uname)" == "Linux" ]; then
    GREP_PERL_MODE="-P"
  fi
  TOMCAT_BASE_URL="http://mirror.vorboss.net/apache/tomcat"
  TOMCAT_VERSION_PRE=$(curl -s "$TOMCAT_BASE_URL/tomcat-$${typeSourceVarName}_VERSION/"|grep -m1 -o $GREP_PERL_MODE "<a href=\\"v\\d*.\\d*.\\d*" || echo "__________9.0.10")
  TOMCAT_VERSION=\${TOMCAT_VERSION_PRE:10}
  TOMCAT_URL=$TOMCAT_BASE_URL/tomcat-$${typeSourceVarName}_VERSION/v$TOMCAT_VERSION/bin/apache-tomcat-$TOMCAT_VERSION.tar.gz`;

const getSource = (typeSourceVarName, pidFile) => `
if [ "$${typeSourceVarName}" == "download" ]; then
  if [ -f "${pidFile}" ] && [ "$(<${pidFile})" != "download" ]; then
    echo "Tomcat running but started from different source type"
    exit 1
  fi
  # download tomcat
  if [ ! -f "/\${TMPDIR:-/tmp}/apache-tomcat-$TOMCAT_VERSION.tar" ]; then
    curl -s $TOMCAT_URL | gzip -d >/\${TMPDIR:-/tmp}/apache-tomcat-$TOMCAT_VERSION.tar
  fi
  # extract tomcat
  if [ ! -d "./apache-tomcat-$TOMCAT_VERSION" ]; then
    tar -xf /\${TMPDIR:-/tmp}/apache-tomcat-$TOMCAT_VERSION.tar -C ./localrun
  fi
fi
`;