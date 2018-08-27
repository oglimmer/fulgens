
const crypto = require('crypto');
const hash = crypto.createHash('sha256');

/* 
  - works only with docker (must be ignored for local, currently unsupported for download)
  - creates tmp dir
  - writes static(!) config files into tmp dir
  - mounts tmp dir into docker container

  config is like: {
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
    cat <<EOT${this.TmpFolder} > localrun/${this.TmpFolder}/${this.Name}
${this.Content.join('\n')}
EOT${this.TmpFolder}
      `;
  }

}

/* 
  - node: works with local, docker
  - tomcat: works with download, docker
  - creates tmp dir
  - writes static and dynamic content into a config file (inside the tmp dir)
  - local/download: exports a Env-Var wich points to the new config file
  - docker: adds -e (Env-Var pointing to the config file) and -v (mounting the tmp dir) to docker

  config is like: {
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
    this.Content = config.Content ? config.Content : [];
    this.Connections = config.Connections ? config.Connections : [];
    this.AttachAsEnvVar = config.AttachAsEnvVar;
    hash.update(this.pluginName + this.Name);
    this.TmpFolder = hash.digest('hex').substring(0, 8);
  }

  /*private*/ createFile() {
    return `
  mkdir -p localrun/${this.TmpFolder}
  > localrun/${this.TmpFolder}/${this.Name}
${this.Content.map(c => `  echo "${c}">>localrun/${this.TmpFolder}/${this.Name}`).join('\n')}`;
  }

  /* download & local */
  storeFileAndExportEnvVar() {
    return `
      ${this.createFile()}
` + this.Connections.map(c => 
    `  echo "${c.Var}=` + ( c.Content ? `${c.Content.replace('$$VALUE$$', 'localhost')}` : 'localhost' ) 
    + `">>localrun/${this.TmpFolder}/${this.Name}`).join('\n') + `
  export ${this.AttachAsEnvVar[0]}="${this.AttachAsEnvVar[1].replace('$$SELF_NAME$$', `localrun/${this.TmpFolder}/` + this.Name)}"
    `;
  }

  /* docker */
  mountToDocker() {
    return `-v $(pwd)/localrun/${this.TmpFolder}:/tmp/${this.TmpFolder} -e ${this.AttachAsEnvVar[0]}="${this.AttachAsEnvVar[1].replace('$$SELF_NAME$$', `/tmp/${this.TmpFolder}/${this.Name}`)}"`
  }

  /* docker */
  storeFileForDocker() {
    const reducedConnections = Array.from(this.Connections.reduce((accumulator, currentValue) => {
      var arrayOnSource = accumulator.get(currentValue.Source);
      if (!arrayOnSource) {
        arrayOnSource = [currentValue];
        accumulator.set(currentValue.Source, arrayOnSource);
      } else {
        arrayOnSource.push(currentValue);
      }
      return accumulator;
    }, new Map()).entries());
    return `
    mkdir -p localrun/webapps/
    ${this.createFile()}
    ## logic to connect any DATA_SOURCE to this Tomcat running Docker` + reducedConnections.map(e => `
    if [ "$TYPE_SOURCE_${e[0].toUpperCase()}" == "docker" ]; then
      dockerCouchRef="--link $dockerContainerID${e[0]}"
    ` + e[1].map(c => `
      echo "${c.Var}=` 
        + ( c.Content ? `${c.Content.replace('$$VALUE$$', `$dockerContainerID${c.Source}`)}` : `$dockerContainerID${c.Source}` )
        + `">>localrun/${this.TmpFolder}/${this.Name}
    `).join('\n') + `
    elif [ "$TYPE_SOURCE_${e[0].toUpperCase()}" == "local" ]; then
      if [ "$(uname)" != "Linux" ]; then ` + e[1].map(c => `
        echo "${c.Var}=` + ( c.Content ? `${c.Content.replace('$$VALUE$$', 'host.docker.internal')}` : `host.docker.internal` ) 
        + `">>localrun/${this.TmpFolder}/${this.Name}
    `).join('\n') + `
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

