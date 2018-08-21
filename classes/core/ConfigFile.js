
const crypto = require('crypto');
const hash = crypto.createHash('sha256');

/* config is like: {
    Name: "my.cnf",
    Content: [
      "[mysqld]",
      "collation-server = utf8_unicode_ci",
      "init-connect='SET NAMES utf8'",
      "character-set-server = utf8"
    ],
    AttachIntoDocker: "/etc/mysql/conf.d"
  }
*/
class AttachIntoDocker {

  constructor(pluginName, config) {
    this.pluginName = pluginName;
    this.Name = config.Name;
    this.Content = config.Content;
    this.AttachIntoDocker = config.AttachIntoDocker;
    hash.update(this.pluginName + this.Name);
    this.TmpFolder = hash.digest('hex').substring(0, 8);
  }

  makeDockerVolume() {
    return `-v \$(pwd)/localrun/${this.TmpFolder}:/etc/mysql/conf.d`;
  }

  writeDockerConnectionLogic() {
      return `
    mkdir -p localrun/${this.TmpFolder}
    cat <<EOT > localrun/${this.TmpFolder}/${this.Name}
${this.Content.join('\n')}
EOT
      `;
  }

}

/* config is like: {
    Name: "java.properties",
    Connections: [ { Source:"couchdb", Var: "couchdb.host" ],
    Content: [ "toldyouso.domain=http://localhost:8080/toldyouso" ],
    AttachAsEnvVar: ["JAVA_OPTS", "-Dtoldyouso.properties=$$SELF_NAME$$"]
  }
*/
class AttachAsEnvVar {

  constructor(pluginName, config) {
    this.pluginName = pluginName;
    this.Name = config.Name;
    this.Content = config.Content;
    this.Connections = config.Connections;
    this.AttachAsEnvVar = config.AttachAsEnvVar;
  }

  makeEnvVar() {
    return `
      echo "${this.Content}">localrun/${this.Name}
      export ${this.AttachAsEnvVar[0]}="${this.AttachAsEnvVar[1].replace('$$SELF_NAME$$', 'localrun/' + this.Name)}"
    `;
  }

  makeDockerEnvVar() {
    return `-e ${this.AttachAsEnvVar[0]}="${this.AttachAsEnvVar[1].replace('$$SELF_NAME$$', '/usr/local/tomcat/webapps/' + this.Name)}"`
  }

  writeDockerConnectionLogic() {
      return `
    mkdir -p localrun/webapps/
    echo "${this.Content}">localrun/webapps/${this.Name}
    ## logic to connect any DATA_SOURCE to this Tomcat running Docker`
    + this.Connections.map(c => `
    if [ "$TYPE_SOURCE_${c.Source.toUpperCase()}" == "docker" ]; then
      echo "${c.Var}=$dockerContainerID${c.Source}">>localrun/webapps/${this.Name}
      dockerCouchRef="--link $dockerContainerID${c.Source}"
    elif [ "$TYPE_SOURCE_${c.Source.toUpperCase()}" == "local" ]; then
      if [ "$(uname)" != "Linux" ]; then
        echo "${c.Var}=host.docker.internal">>localrun/webapps/${this.Name}
      else 
        dockerCouchRef="--net=host"
      fi
    fi
    `).join('\n');
  }

}

module.exports = (pluginName, config) => {
  if (config.AttachAsEnvVar) {
    return new AttachAsEnvVar(pluginName, config);
  }
  else if (config.AttachIntoDocker) {
    return new AttachIntoDocker(pluginName, config);
  }
  else {
    throw Error(`Undefined type for ${pluginName} : ${JSON.stringify(config)}`);
  }
};

