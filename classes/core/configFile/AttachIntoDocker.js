
const nunjucks = require('nunjucks');

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
    Connections: [{
      Source: "lucene",
      Var: "_fti",
      Content: "{couch_httpd_proxy, handle_proxy_req, <<\\\"http://$$VALUE$$:5985\\\">>}"
    }],
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
    // reduce an array of objects (Source, Var, Content) into a Map Key:Source, Value: array of original objects
    const mapSourceToConnections = this.Connections.reduce((accumulator, currentValue) => {
      
      currentValue.VarRpl = currentValue.Var.replace('.', '_');
      currentValue.ContentRpl = replaceStr => currentValue.Content ? currentValue.Content.replace('$$VALUE$$', replaceStr) : replaceStr;

      var arrayOnSource = accumulator.get(currentValue.Source);
      if (!arrayOnSource) {
        arrayOnSource = [currentValue];
        accumulator.set(currentValue.Source, arrayOnSource);
      } else {
        arrayOnSource.push(currentValue);
      }
      return accumulator;
    }, new Map());

    return nunjucks.render('classes/core/configFile/AttachIntoDocker.tmpl', {
      TmpFolder: this.TmpFolder,
      Name: this.Name,
      Content: this.Content,
      mapSourceToConnections,
      refVarName,
      connectionsContainsKey: line => this.Connections.find(c => c.Var == line.split(/=/)[0]),
    });
  }

}

module.exports = AttachIntoDocker;
