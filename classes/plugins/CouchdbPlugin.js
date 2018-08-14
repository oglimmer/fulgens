
const headBuilder = require('../phase/head');
const functionsBuilder = require('../phase/functions');
const buildBuilder = require('../phase/build');
const cleanupBuilder = require('../phase/cleanup');
const prepareBuilder = require('../phase/prepare');
const dependencycheckBuilder = require('../phase/dependencycheck');
const getsourceBuilder = require('../phase/getsource');
const postbuildBuilder = require('../phase/postbuild');
const startBuilder = require('../phase/start');
const poststartBuilder = require('../phase/poststart');
const sourceTypeBuilder = require('../core/SourceType');

class CouchdbPlugin {

  static instance() {
    return new CouchdbPlugin();
  }

  register(softwareComponentName, userConfig, runtimeConfiguration) {
    
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {

    const CouchDB = userConfig.software[softwareComponentName].CouchDB;

    dependencycheckBuilder.add('docker --version 1>/dev/null');
 
    startBuilder.add(start(softwareComponentName));

    sourceTypeBuilder.add(softwareComponentName, 'docker', [
      { typeName: 'docker', defaultVersion: '1.7' },
      { typeName: 'local', defaultVersion: '' }
    ]);
 
    cleanupBuilder.add('CouchDB', [{
      name: 'docker',
      stopCode: 'docker rm -f $dockerContainerID' + softwareComponentName
    }]);


    poststartBuilder.add(`
while [ "$(curl --write-out %{http_code} --silent --output /dev/null http://localhost:5984)" != "200" ]; do
  echo "waiting for couchdb..."
  sleep 1
done`);

    if (CouchDB.Schema) {
      poststartBuilder.add(`if [[ "$(curl -s http://localhost:5984/${CouchDB.Schema})" =~ .*"error".*"not_found".* ]]; then`);
      poststartBuilder.add(`  curl -X PUT http://localhost:5984/${CouchDB.Schema}`);
      if (CouchDB.Create) {
        poststartBuilder.add(CouchDB.Create.map(e => 
          ` curl -X POST -H "Content-Type: application/json" -d @${e} http://localhost:5984/${CouchDB.Schema}`)
          .join('\n'));
      }
      poststartBuilder.add('fi');
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