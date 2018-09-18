
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const log = s => {
  if (typeof s === 'string') {
    console.error(s);
  } else {
    console.error(JSON.stringify(s, null, 2));
  }
}

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

  constructor(pluginName, config, runtimeConfiguration) {
    this.runtimeConfiguration = runtimeConfiguration;
    this.pluginName = pluginName;
    this.Name = config.Name;
    this.Content = config.Content;
    this.AttachIntoDocker = config.AttachIntoDocker;
    this.Connections = config.Connections ? config.Connections : [];
    const hash = crypto.createHash('sha256');
    hash.update(this.pluginName + this.Name);
    this.TmpFolder = hash.digest('hex').substring(0, 8);
  }

  makeDockerVolume() {
    return `-v "\$(pwd)/localrun/${this.TmpFolder}:${this.AttachIntoDocker}"`;
  }

  writeDockerConnectionLogic(refVarName) {
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
    const insertREPLVAR = (e, rpl) => e.map(c => 
      `REPLVAR${c.Var.replace('.', '_')}="${(c.Content ? c.Content.replace('$$VALUE$$', rpl(c)) : rpl(c))}"`)
      .join('\n');
    return `
    mkdir -p localrun/${this.TmpFolder}` +
    reducedConnections.map(e => `
    if [ "$TYPE_SOURCE_${e[0].toUpperCase()}" == "docker" ]; then
      ${refVarName}="--link $dockerContainerID${e[0]}"
      ${insertREPLVAR(e[1], c => `$dockerContainerID${c.Source}`)}
    elif [ "$TYPE_SOURCE_${e[0].toUpperCase()}" == "local" ]; then
      if [ "$(uname)" != "Linux" ]; then 
      ${insertREPLVAR(e[1], () => 'host.docker.internal')}
      else 
        ${refVarName}="--net=host"
      fi
    fi
    `).join('\n') +
    `
    cat <<EOT${this.TmpFolder} > localrun/${this.TmpFolder}/${this.Name}
${this.Content.map(l => {
        const connToReplace = this.Connections.find(c => c.Var == l.split(/=/)[0])
        if (connToReplace) {
          return `${connToReplace.Var}=$REPLVAR${connToReplace.Var.replace('.', '_')}`;
        } else {
          return l;
        }
      }).join('\n')}
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
    LoadDefaultContent: 'src/main/resources/default.properties',
    AttachAsEnvVar: ["JAVA_OPTS", "-Dtoldyouso.properties=$$SELF_NAME$$"]
  }
*/
class AttachAsEnvVar {

  constructor(pluginName, config, runtimeConfiguration) {
    this.runtimeConfiguration = runtimeConfiguration;
    this.pluginName = pluginName;
    this.Name = config.Name;
    this.Content = config.Content ? config.Content : [];
    this.LoadDefaultContent = config.LoadDefaultContent;
    this.Connections = config.Connections ? config.Connections : [];
    this.AttachAsEnvVar = config.AttachAsEnvVar;
    const hash = crypto.createHash('sha256');
    hash.update(this.pluginName + this.Name);
    this.TmpFolder = hash.digest('hex').substring(0, 8);
  }

  /*private*/ createFile() {
    /*
     - this.Content is either static content or []
     - load default content if given and add it to this.Content
     - loop over all entries finding Connection-vars and replacing them $REPLVAR???
     - add Connections-vars not defined in Content or LoadDefaultContent
     - append this to the static content from Fulgensfile
    */
    var allContent = this.Content.slice(0);
    if (this.LoadDefaultContent) {
      const loadedContent = fs.readFileSync(path.resolve(this.runtimeConfiguration.projectBasePath, this.LoadDefaultContent), { encoding: 'utf8' });
      allContent.push(...loadedContent.split(/\r?\n/));
    }
    var connectionsFound = {};
    allContent = allContent.map(l => {
      const connToReplace = this.Connections.find(c => c.Var == l.split(/=/)[0])
      if (connToReplace) {
        connectionsFound[connToReplace.Var] = true;
        return `${connToReplace.Var}=$REPLVAR${connToReplace.Var.replace('.', '_')}`;
      } else {
        return l;
      }
    });
    const justConnectionVars = this.Connections.filter(c => !connectionsFound[c.Var]).map(c => `${c.Var}=$REPLVAR${c.Var.replace('.', '_')}`);
    allContent.push(...justConnectionVars);
    return `
  mkdir -p localrun/${this.TmpFolder}
  cat <<EOT${this.TmpFolder} > localrun/${this.TmpFolder}/${this.Name}
${allContent.join('\n')}
EOT${this.TmpFolder}
    `;
  }

  /* download & local */
  storeFileAndExportEnvVar() {
    return `
      ${this.Connections.map(c => `REPLVAR${c.Var.replace('.', '_')}="` + ( c.Content ? `${c.Content.replace('$$VALUE$$', 'localhost')}` : 'localhost' ) + '"')}
      ${this.createFile()}
  export ${this.AttachAsEnvVar[0]}="${this.AttachAsEnvVar[1].replace('$$SELF_NAME$$', `localrun/${this.TmpFolder}/` + this.Name)}"
    `;
  }

  /* docker */
  mountToDocker() {
    return `-v "$(pwd)/localrun/${this.TmpFolder}:/tmp/${this.TmpFolder}" -e ${this.AttachAsEnvVar[0]}="${this.AttachAsEnvVar[1].replace('$$SELF_NAME$$', `/tmp/${this.TmpFolder}/${this.Name}`)}"`
  }

  /* docker */
  storeFileForDocker(refVarName) {
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
    const insertREPLVAR = (e, rpl) => e.map(c => 
      `REPLVAR${c.Var.replace('.', '_')}="${(c.Content ? c.Content.replace('$$VALUE$$', rpl(c)) : rpl(c))}"`)
      .join('\n');
    return `
    mkdir -p localrun/webapps/`
    + reducedConnections.map(e => `
    if [ "$TYPE_SOURCE_${e[0].toUpperCase()}" == "docker" ]; then
      ${refVarName}="--link $dockerContainerID${e[0]}"
      ${insertREPLVAR(e[1], c => `$dockerContainerID${c.Source}`)}
    elif [ "$TYPE_SOURCE_${e[0].toUpperCase()}" == "local" ]; then
      if [ "$(uname)" != "Linux" ]; then 
      ${insertREPLVAR(e[1], () => 'host.docker.internal')}
      else 
        ${refVarName}="--net=host"
      fi
    fi
    `).join('\n') + `
    ${this.createFile()}
    `;
  }

}

module.exports = (pluginName, config, runtimeConfiguration) => {
  if (config.AttachAsEnvVar) {
    return new AttachAsEnvVar(pluginName, config, runtimeConfiguration);
  }
  else if (config.AttachIntoDocker) {
    return new AttachIntoDocker(pluginName, config, runtimeConfiguration);
  }
  else {
    throw Error(`Undefined type for ${pluginName} : ${JSON.stringify(config)}`);
  }
};

