

class ConfigFile {

  constructor(pluginName, config) {
    /* config is like: {
        Name: "java.properties",
        Connections: [ { Source:"couchdb", Var: "couchdb.host" ],
        Content: [ "toldyouso.domain=http://localhost:8080/toldyouso" ],
        AttachAsEnvVar: ["JAVA_OPTS", "-Dtoldyouso.properties=$$SELF_NAME$$"]
      }
    */
    this.pluginName = pluginName;
    this.Name = config.Name;
    this.Connections = config.Connections;
    this.Content = config.Content;
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

module.exports = ConfigFile;

