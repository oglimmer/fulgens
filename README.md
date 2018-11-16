# Fulgens

This software helps with building, deploying and running software **locally**. It is a shell script generator to orchestrate software components **locally**.

It is not a tool to build software. It is not a tool to remotely deploy software. It is generally not a DevOps tool by any means.

The tool was made for software developers to document deployment dependencies like runtime environments and databases, as well as running it locally as easy as possible.

It standardizes "run this software locally", like maven standardized "build this software".

## How to use it?

1.) Install via npm: `npm -g install fulgens`

2.) Create a Fulgensfile (there is an example down below)

3.) Execute `fulgens` in the same directory as a Fulgensfile and generate a bash script you can use to build, deploy and run your software locally. Start with `fulgens | bash -s -- -h` to read the help for your generated bash script.

Alternatively you can `fulgens > run_local.sh` to persist the generated bash script onto the filesystem. Here is a nice [bash pretty printer](https://github.com/mvdan/sh) as fulgens doesn't properly indent the generated script.

## A simple example / Tutorial

Create a Web project via: `mvn archetype:generate -DgroupId=de.oglimmer -DartifactId=MyApp -DarchetypeArtifactId=maven-archetype-webapp -DinteractiveMode=false`. Step into the new project directory and create a minimal Fulgensfile with this content there:

```
module.exports = {

  config: {
    SchemaVersion: "1.0.0",
    Name: "example",
  },

  software: {
    "MyApp": {
      Source: "mvn",
      Artifact: "target/MyApp.war"
    },

   tomcat: {
      Source: "tomcat",
      Deploy: "MyApp"
    }
  }
}
```
Run `fulgens>run_local.sh` to create a bash script. Follow with `chmod 755 run_local.sh` to make it runnable and finally build, deploy and run via `./run_local.sh -f`.

Now browse to [http://localhost:8080/MyApp/]()

Now try `./run_local.sh -f -t tomcat:docker` to run the Tomcat inside a Docker container. Or `./run_local.sh -f -b docker` to build inside Docker, but run on your local machine.

## Supported software

A Fulgensfile defines all software components needed to run a project. Supported software is

* java / maven
* node
* shell script
* tomcat
* mysql
* couchdb
* redis

Futhermore Vagrant/VirtualBox is supported as well.

## A Fulgensfile and its anatomy

A Fulgensfile may have the file extension ".js", it is recommended to name it "Fulgensfile.js".

A [json-schema.org](http://json-schema.org) compliant json-schema file can be found [here](fulgensfile-schema.json)

The Fulgensfile is JavaScript file defining an (JSON) object and assigning it to `module.exports`.

It must contain two attributes

* config
* software

This is a minimal and basic Fulgensfile:

```
module.exports = {
  config: {
    SchemaVersion: "1.0.0",
    Name: ".....",
  },
  software: {
  }
}

```

### The root object `config`

config defines overall configuration parameters.

Attribute name            | Type | Description
----------------------- | ---- | -----------
SchemaVersion | string | Required. Must be "1.0.0"
Name | string | Required. The name of the software
Vagrant | object | Defines how a vagrant VM should be spun up
JavaVersions | array of strings | If a software requires a certain version(s) of java, this attribute can document and limit those compatible versions By default the script will not change JAVA\_HOME. Though on macOS the script will provide a parameter to switch  Java (respectively JAVA\_HOME) to 1.8, 9 or 10. To document the compatibility one can set JavaVersions in the config section. As said on macOS this also defines the possible values for the "-j" parameter.Java version this project is compabile with. On macOS this value will be used with /usr/libexec/java_home
UseHomeM2 | boolean | Default is false, if set to true ~/.m2 will be used for Vagrant and Docker environments
BuildDependencies | object | Defines additional apt or npm packages needed for a build 
Dependencycheck | array of strings | shell code to execute to check if a dependency or prerequisite is ok

#### The object `Vagrant`

Must be inside the root object config.

Attribute name            | Type | Description
----------------------- | ---- | -----------
Box | string | Required. Vagrant box name like ubuntu/xenial64. Only Debian based systems are supported.
Install | string | Space separated apt packages to install. E.g. "maven openjdk-8-jdk-headless docker.io"
BeforeInstall | array of strings | shell command to execute before the apt packages from Install are installed
AfterInstall | array of string | shell command to execute after the apt packages from Install are installed

#### The object `BuildDependencies`

Must be inside the root object config.

Attribute name            | Type | Description
----------------------- | ---- | -----------
Apt | array of strings | Apt package names.
Npm | array of strings | Npm package names. The apt package "nodejs" will be automatically added to apt if this is array as at least one element


### The root object `software`

All software components will be configured under software, by adding an attribute for each component like a mysql, doing a maven build or starting a tomcat.

There are no other attributes than software components. The attribute name is the software component name and can be freely choosen. The value is an object defining the software component. The only always required attribute per software component is "Source" which defines the type of software and thus plugin to be used.

Attribute name            | Type | Description
----------------------- | ---- | -----------
Source | strings | "java", "mvn", "node", "mysql", "couchdb", "redis", "shell"

#### Defining a maven software component

To build a Java project via maven, the maven plugin can be used to build locally or within a docker container. When doing a local build the -j JAVA_VERSION setting is respected.

Required and mvn specific attributes:

Attribute name            | Type | Description
----------------------- | ---- | -----------
Source | string | Required. Must be "mvn"
Mvn | object | Optional. Defines maven specific config
Mvn.Goal | string | Optional. Default is "package". Defines a maven goal, e.g. "install"

Supported common attributes:

Git, Param, Dir, dockerImage, EnvVars, BeforeBuild, AfterBuild

Example software component for mvn:

```
software: {
	foo: {
		Source: "mvn",
		Artifact: "target/foo.war",	
	}
}
```


#### Defining a nodejs software component

To run a node.js application a local node binary can be used, it is also possible to start and run a Node application inside a docker container.

Required and node specific attributes:

Config param            | Type | Description
----------------------- | ---- | -----------
Source | string | Required. Must be "node"
Start | string | Required. Path to entry point javascript file

Supported common attributes:

Git, Param, Dir, dockerImage, EnvVars, BeforeBuild, AfterBuild, BeforeStart, AfterStart, ExposedPort

Example software component for node:

```
{
software: {
	foo: {
      Source: "node",
      Start: "src/server/start.js"
    }
}
```

#### Defining a java software component

A Java program can be started on the local machine or inside a docker container.

Required and java specific attributes:

Config param            | Type | Description
----------------------- | ---- | -----------
Source | string | Required. Must be "java"
Start | string | Required. Name of another software component which defined an Artifact attribute, as this will be started

Supported common attributes:

Git, Param, Dir, dockerImage, EnvVars, BeforeStart, AfterStart, ExposedPort

Example software component for java:

```
software: {
  javaprogram: {
    Source: "java",
	 Start: "<<name of another software component>>"
  }
}
```


#### Defining a shell software component

A shell script can be started on the local machine or inside a docker container.

Required and shell specific attributes:

Config param            | Type | Description
----------------------- | ---- | -----------
Source | string | Required. Must be "shell"
Start | string | Required. Name of another software component which defined an Artifact attribute, as this will be started

Supported common attributes:

Git, Param, Dir, dockerImage, EnvVars, BeforeStart, AfterStart, ExposedPort

Example software component for shell:

```
software: {
  program: {
    Source: "shell",
	 Start: "<<name of another software component>>"
  }
}
```


#### Defining a tomcat to host a software component

To run a web application a fresh Tomcat can be downloaded, extracted and started, it is also possible to start and run a Tomcat instance inside a docker container. Also an existing local Tomcat installation can be reused.

Required and tomcat specific attributes:

Config param            | Type | Description
----------------------- | ---- | -----------
Source | string | Required. Must be "tomcat"
Deploy | string | Required. Name of another component. The file defined in its Artifact config will be copied to Tomcat's /webapp folder
Lib | array of strings | Name of another component. The file defined in its Artifact config will be copied to Tomcat's /lib folder
SourceTypes | array of strings | Optional. Default is "download", "local", "docker". This parameter can limit the option of source types.

Supported common attributes:

Git, Param, Dir, dockerImage, EnvVars, BeforeStart, AfterStart, ExposedPort

Example software component for tomcat:

```
software: {
  tomcatWebServer: {
    Source: "tomcat",
    Deploy: "<<name of a different software compoenent>>",
    Lib: [ "<<name of a different software compoenent>>" ],
    SourceTypes: [ "download", "local" ]
  }
}
```

#### Defining a mysql database

A MySQL database can be started and used inside a docker container or an existing local installation can be reused.

Required and mysql specific attributes:

Config param            | Type | Description
----------------------- | ---- | -----------
Source | string | Required. Must be "mysql"
Mysql | object | optional, defines the mysql specific config
Mysql.Schema | string | Creates this schema if it doesn't exist
Mysql.Create | array of string | sql files to execute after startup
Mysql.RootPassword | string | Root password to set

Supported common attributes:

Git, Param, Dir, dockerImage, EnvVars, BeforeStart, AfterStart, ExposedPort

Example software component for mysql:


```
software: {
  "mysqlserver": {
    Source: "mysql",
    Mysql: {
      Schema: "my_new_schema",
      Create: [
        "src/mysql/initial_ddl.sql",
        "src/mysql/initial_data.sql"
     ],
     RootPassword: "root"
    }
}
```

#### Defining a couchdb database

A CouchDB database can be started and used inside a docker container or an existing local installation can be reused.

Required and couchdb specific attributes:

Config param            | Type | Description
----------------------- | ---- | -----------
Source | string | Required. Must be "couchdb"
CouchDB | array of objects | optional, defines the couchdb specific config
CouchDB.Schema | string | Creates this schema if it doesn't exist
CouchDB.Create | array of string | json file imported after startup, usually something like views

Supported common attributes:

Git, Param, Dir, dockerImage, EnvVars, BeforeStart, AfterStart, ExposedPort

Example software component for couchdb:

```
software: {
  'couchdbserver': {
    Source: "couchdb",
    CouchDB: [{
      Schema: "toldyouso",
      Create: [ "src/couchdb/_design-User-view.json" ]
    }]
  }   
}
```

#### Defining a redis database

A Redis database can be started and used inside a docker container or an existing local installation can be reused.

Required and redis specific attributes:

Config param            | Type | Description
----------------------- | ---- | -----------
Source | string | Required. Must be "redis"

Supported common attributes:

Git, Param, Dir, dockerImage, EnvVars, BeforeStart, AfterStart, ExposedPort

Example software component for redis:

```
software: {
  'redisserver': {
    Source: "redis"
  }   
}
```

### Common attributes

Many attributes are supported by multiple types of software components.

This spreadsheet shows which plugins support which parameters: [Plugin Parameter overview](https://docs.google.com/spreadsheets/d/1hlUBx-VqfPDbTl2bjku6NShqFiDKP0lqODsQ2fB8GVY/edit#gid=1313054163)


#### Git

Fulgens can clone a git repository.

Config param            | Type | Description
----------------------- | ---- | -----------
Git | string | git URL to clone or pull. A branch name can be added after a space.

#### Param

A software component can be made optional. If done so a parameter must be given to the generated bash script to run the code for this software component.

Config param            | Type | Description
----------------------- | ---- | -----------
Param | object | Defines a script switch / parameter to make this software component optinal
Param.Char | string with size 1 | character to use for this script parameter. Must not use h,s,c,k,t
Param.VariableName | string | Shell variable name to set to YES if the parameter was given to the script
Param.Description | string | A description for the help section of the script

Example:

```
software: {
  barDependency: {
    Source: "mvn",
    Git: "https://github.com/foo/bar.git",
    Dir: "$$TMP$$/bar-lib",
    Mvn: {
      Goal: "install"
    },
    Param: {
      Char: "o",
      VariableName: "BAR_LIB_ENABLED",
      Description: "Clone, build and install bar dependency"
    }
  }
```

#### Dir

A software component uses the same directory than the Fulgensfile by default. However the working directory can be changed by the attribute Dir.

Config param            | Type | Description
----------------------- | ---- | -----------
Dir | string | Defines the directory where the build will performed. Must be inline where the source code be found. Default is "."

#### BeforeStart and AfterStart

It is possible to execute shell code before or after a software component has started.

Config param            | Type | Description
----------------------- | ---- | -----------
BeforeBuild | array of string | Bash code to execute before the component is started
AfterBuild | array of string | Bash code to execute after the component is started


#### DockerImage

Each software component type (plugin) has a docker image associated. This can be changed via this attribute.

Config param            | Type | Description
----------------------- | ---- | -----------
DockerImage | string | docker image name without version

#### EnvVars

This attributes allows the definition of environment variables. They will be passed to the application in an appropriate manner.

Config param            | Type | Description
----------------------- | ---- | -----------
EnvVars | array of strings | string of the type "variable\_name=variable\_value". $$TMP$$ will be replaced with the working directory of the generated file

#### ExposedPort

When starter a docker container the system needs to know which port a component exposes.

Config param            | Type | Description
----------------------- | ---- | -----------
ExposedPort | number | The TCP port number this software bind to

#### BeforeBuild and AfterBuild

It is possible to execute shell code before or after a build (mvn/node) is done.

Config param            | Type | Description
----------------------- | ---- | -----------
BeforeBuild | array of string | Bash code to execute before the build is performed
AfterBuild | array of string | Bash code to execute after the build is performed


### Config files

In Fulgens a software components can define config files. This mechanism allows it to override or add static configuration values, as well as to replace host names in configuration files at run-time.

Config param            | Type | Description
----------------------- | ---- | -----------
Name | string | Required. Name of the config file
Connections | object | Optional. Defines a at run-time replaced config file row
Connections.Source | string | Required. This references another software component by its name
Connections.Var | string | Required. Variable name of the config file row.
Connections.Content | string | Optional. Right side part of the config file row. $$VALUE$$ will be replaced by the host name at run-time.
Content | array of strings | Optional. key=value added to the config file
LoadDefaultContent | string | Optional. Absolute or relative file path to a config file
AttachAsEnvVar | array of 2 strings | Mutually exclusive to AttachIntoDocker. The config file will be attached to the application via an environment variable. The first string defines the name of the environment variable. The second string defines the value where $$SELF_NAME$$ will be replaced by the file path to the config file at run-time
AttachIntoDocker | string | Mutually exclusive to AttachAsEnvVar. The config file will be mounted into docker via a directory. This defines the absolute path on the docker filesystem

Example:

```
config: {
    Name: "app.properties",
    Connections: [{
        Source:"mysql",
        Var: "mysql.url",
        Content: "jdbc:mysql://$$VALUE$$:3306/schema"
    }],
    Content: [
        "bind=0.0.0.0",
        "user=foobar"
    ],
    AttachAsEnvVar: ["JAVA_OPTS", "-Dapp.filename=$$SELF_NAME$$"]        
    // or
    AttachIntoDocker: "/usr/local/etc/app/local.d"
}
```
