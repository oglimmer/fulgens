
const headBuilder = require('../phase/head');
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

    const CouchDB = userConfig.software[softwareComponentName].CouchDB;

    dependencycheckBuilder.add('docker --version 1>/dev/null');
    
    optionsBuilder.addDetails('t', [
      `${softwareComponentName}:local #reuse a local, running CouchDB installation, does not start/stop this CouchDB`,
      `${softwareComponentName}:docker:[1.7|2] #start docker image couchdb:X`]);

    const configFiles = runtimeConfiguration.getConfigFiles(softwareComponentName);

    this.startBuilder.add(start(softwareComponentName, configFiles));

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'docker', 
      availableTypes: [
        { typeName: 'docker', defaultVersion: '1.7' },
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


    this.poststartBuilder.add(`
while [ "$(curl --write-out %{http_code} --silent --output /dev/null http://localhost:5984)" != "200" ]; do
  echo "waiting for couchdb..."
  sleep 1
done`);

    if (CouchDB) {
      const genCouchDB = couchDBEle => {
        this.poststartBuilder.add(`if [[ "$(curl -s http://localhost:5984/${couchDBEle.Schema})" =~ .*"error".*"not_found".* ]]; then`);
        this.poststartBuilder.add(`  curl -X PUT http://localhost:5984/${couchDBEle.Schema}`);
        if (couchDBEle.Create) {
          this.poststartBuilder.add(couchDBEle.Create.map(e => 
            ` curl -X POST -H "Content-Type: application/json" -d @${e} http://localhost:5984/${couchDBEle.Schema}`)
            .join('\n'));
        }
        this.poststartBuilder.add('fi');
      }
      if (Array.isArray(CouchDB)) {
        CouchDB.forEach(genCouchDB);
      } else {
        genCouchDB(CouchDB);
      }
    }
  }

}

module.exports = CouchdbPlugin;

const start = (softwareComponentName, configFiles) => {
  const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;
  const pidFile = `.${softwareComponentName}Pid`;
  const dcId = `dockerContainerID${softwareComponentName}`;
  return `
if [ "$${typeSourceVarName}" == "docker" ]; then
  # run in docker
  if [ ! -f "${pidFile}" ]; then
    ${configFiles.map(f => f.writeDockerConnectionLogic('dockerCouchdbExtRef')).join('\n')}
    if [ "$VERBOSE" == "YES" ]; then echo "docker run --rm -d -p 5984:5984 $dockerCouchdbExtRef ${configFiles.map(f => f.makeDockerVolume()).join('\n')} couchdb:$${typeSourceVarName}_VERSION"; fi
    ${dcId}=$(docker run --rm -d -p 5984:5984 $dockerCouchdbExtRef \\
      ${configFiles.map(f => f.makeDockerVolume()).join('\n')} couchdb:$${typeSourceVarName}_VERSION)
    echo "$${dcId}">${pidFile}
  else
    ${dcId}=$(<${pidFile})
  fi
fi
if [ "$${typeSourceVarName}" == "local" ]; then
  if [ -f "${pidFile}" ]; then
    echo "couchdb ${softwareComponentName} running but started from different source type"
    exit 1
  fi
fi
`
};