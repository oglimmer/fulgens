
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
      'couchdb:local #reuse a local, running CouchDB installation, does not start/stop this CouchDB',
      'couchdb:docker:[1.7|2] #start docker image \\`couchdb:X\\`']);

    this.startBuilder.add(start(softwareComponentName));

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'docker', 
      availableTypes: [
        { typeName: 'docker', defaultVersion: '1.7' },
        { typeName: 'local', defaultVersion: '' }
      ]
    });

    cleanupBuilder.add({
      componentName: 'CouchDB',
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

    if (CouchDB && CouchDB.Schema) {
      this.poststartBuilder.add(`if [[ "$(curl -s http://localhost:5984/${CouchDB.Schema})" =~ .*"error".*"not_found".* ]]; then`);
      this.poststartBuilder.add(`  curl -X PUT http://localhost:5984/${CouchDB.Schema}`);
      if (CouchDB.Create) {
        this.poststartBuilder.add(CouchDB.Create.map(e => 
          ` curl -X POST -H "Content-Type: application/json" -d @${e} http://localhost:5984/${CouchDB.Schema}`)
          .join('\n'));
      }
      this.poststartBuilder.add('fi');
    }
  }

}

module.exports = CouchdbPlugin;

const start = softwareComponentName => `
if [ "$TYPE_SOURCE_COUCHDB" == "docker" ]; then
  # run in docker
  if [ ! -f ".couchdb" ]; then
    dockerContainerID${softwareComponentName}=$(docker run --rm -d -p 5984:5984 couchdb:$TYPE_SOURCE_COUCHDB_VERSION)
    echo "$dockerContainerID${softwareComponentName}">.couchdb
  else
    dockerContainerID${softwareComponentName}=$(<.couchdb)
  fi
fi
if [ "$TYPE_SOURCE_COUCHDB" == "local" ]; then
  if [ -f .couchdb ]; then
    echo "couchdb running but started from different source type"
    exit 1
  fi
fi
`;