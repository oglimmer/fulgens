# Fulgens

This software helps with building, deploying and running software **locally**. It is a shell script generator to orchestrate software components **locally**.

It is not a tool to build software. It is not a tool to remotely deploy software. It is generally not a DevOps tool by any means.

The tool was made for software developers to document deployment dependencies like runtime environments and databases, as well as running it locally as easy as possible.

It standardizes "run this software locally", like maven standardized "build this software".

## How to use it?

1.) Install via npm: `npm -g install fulgens`

2.) Create a Fulgensfile (there is an example down below)

3.) Execute `fulgens` in the same directory as a Fulgensfile and generate a bash script you can use to build, deploy and run your software locally. Start with `fulgens | bash -s -- -h` to read the help for your generated bash script.

## A simple example / Tutorial

Create a Web project via: `mvn archetype:generate -DgroupId=de.oglimmer -DartifactId=MyApp -DarchetypeArtifactId=maven-archetype-webapp -DinteractiveMode=false`. Step into the new project directory and create a minimal Fulgensfile with this content there:

```
module.exports = {

  config: {
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

### Build environments

### java

By default the script will not change JAVA_HOME. Though on macOS the script will provide a parameter to switch  Java (respectively JAVA_HOME) to 1.8, 9 or 10.

To document the compatibility one can set JavaVersion in the config section. As said on macOS this also defines the possible values for the "-j" parameter.

```
config: {
	JavaVersion: [ "1.8", "9", "10" ]
}
```

Config param            | Type | Description
----------------------- | ---- | -----------
config.JavaVersion | array of string | Java version this project is compabile with. On macOS this value will be used with /usr/libexec/java_home


#### maven

Can be used to build locally or within a docker container. When doing a local build the -j JAVA_VERSION setting is respected.

Example:

```
software: {

	// Example for an external project sitting in git
	// which is needed to be installed to build/run this software

	"a_external_dependency_project": {
	  Source: "mvn",
	  Git: "url_to_git_repo",
	  Mvn: {
	    Dir: "$$TMP$$/my-git-repo",
	    Goal: "install"
	  },
	  Param: {
	    Char: 'o',
	    VariableName: 'BASH_VAR_NAME',
	    Description: 'Use this switch to set BASH_VAR_NAME to YES'
	  }
	},

	// Example for an external file sitting in a mvn repository
	// which is needed to be installed to run this software
    
	mysqldriver: {
	  Source: "mvn",
	  Mvn: {
	    Dir: "$$TMP$$/lib",
	    Goal: "dependency:copy -Dartifact=mysql:mysql-connector-java:8.0.12 -DoutputDirectory=$$TMP$$/lib/"
	  },
	  Artifact: "$$TMP$$/lib/mysql-connector-java-8.0.12.jar"
	},
	
	// Example how to build this project via maven
	// Assumes the need of npm and jasmine via the build process
	// Also creates a config file with the hostname/IP of a couchdb
    
	"my_mvn_build_software": {
	  Source: "mvn",
	  Mvn: {
	    BuildDependencies: {
	      apt: [ "npm" ],
	      npm: [ "jasmine" ]
	    }
	  },
	  Artifact: "target/my_mvn_build_software.war",
	  "my_mvn_build_software_config": {
	    Name: "my.properties",
	    Connections: [ { Source:"<SOFTWARE_NAME>", Var: "couchdb.host" } ],
	    Content: [
	      "var1=value1",
	      "var2=value21"
	    ],
	    AttachAsEnvVar: ["JAVA_OPTS", "-Dmy.properties=$$SELF_NAME$$"]
	  },
	  BeforeBuild: "..bash code run before the build..",
	  AfterBuild: ".. bash code after the build"
	}
}
```
  
Config param            | Type | Description
----------------------- | ---- | -----------
software.COMPONENT\_NAME.Source | string | must be "mvn"
software.COMPONENT\_NAME.Git | string | Optional, git URL to checkout or pull
software.COMPONENT\_NAME.Mvn | object | Optional. Defines maven specific config
software.COMPONENT\_NAME.Mvn.Dir | string | Optional. Defines the directory where the build will performed. Must be inline where the source code be found. Default is ".".
software.COMPONENT\_NAME.Mvn.Goal | string | Optional. Default is "package". Defines a maven goal, e.g. "install"
software.COMPONENT\_NAME.Mvn.BuildDependencies | object | Optional. Defines build dependencies for apt and npm
software.COMPONENT\_NAME.Mvn.BuildDependencies.apt | array of string | apt package to install for docker based builds
software.COMPONENT\_NAME.Mvn.BuildDependencies.npm | array of string | npm package to install for docker based builds. Make sure you have added node, nodejs or npm to the apt dependencies when using a npm package
software.COMPONENT\_NAME.Param | object | Optional. Defines a script switch / parameter to make this software component optinal
software.COMPONENT\_NAME.Param.Char | string with size 1 | character to use for this script parameter. Must not use h,s,c,k,t
software.COMPONENT\_NAME.Param.VariableName | string | Shell variable name to set to YES if the parameter was given to the script
software.COMPONENT\_NAME.Param.Description | string | A description for the help section of the script
software.COMPONENT\_NAME.Artifact | string | Defines a file name. For web projects this is usually a war file.
software.COMPONENT\_NAME.BeforeBuild | string | Optional. Bash code to execute before the build is performed
software.COMPONENT\_NAME.AfterBuild | string | Optional. Bash code to execute after the build is performed
software.COMPONENT\_NAME.CONFIG\_FILE\_NAME | object | Optional. Defines a config file e.g. a custom java.properties for the application
software.COMPONENT\_NAME.CONFIG\_FILE\_NAME.Name | string | name of the config file on the file system
software.COMPONENT\_NAME.CONFIG\_FILE\_NAME.Connection | object | Defines connections to other software components like database connections
software.COMPONENT\_NAME.CONFIG\_FILE\_NAME.Connection.Source | string | Name of another software component within this Fulgensfile
software.COMPONENT\_NAME.CONFIG\_FILE\_NAME.Connection.Var | string | A line in the form `key=value` will be added to the config file. This config defines the key, while the hostname of the software component defined via Source will define the value.
software.COMPONENT\_NAME.CONFIG\_FILE\_NAME.Content | array of string | static content of the config file
software.COMPONENT\_NAME.CONFIG\_FILE\_NAME.AttachAsEnvVar | array of string size 2 | Element 0 is shell script variable name. Element 1 the value for this variable. $$SELF_NAME$$ will be replaced with the full filename of the config file

### Runtime environments

#### tomcat

To run a web application a fresh Tomcat can be downloaded, extracted and started, it is also possible to start and run a Tomcat instance inside a docker container. Also an existing local Tomcat installation can be reused.

Example:

```
software: {
  "mytomcat": {
    Source: "tomcat",
    Deploy: "my_mvn_build_software",
    Lib: [ "mysqldriver" ],
    SourceTypes: [ "download", "local" ]
  }
}
```

Config param            | Type | Description
----------------------- | ---- | -----------
software.COMPONENT\_NAME.Source | string | must be "tomcat"
software.COMPONENT\_NAME.Deploy | string | Name of another component. The file defined in its Artifact config will be copied to Tomcat's /webapp folder
software.COMPONENT\_NAME.Lib | array of string | Name of another component. The file defined in its Artifact config will be copied to Tomcat's /lib folder
software.COMPONENT\_NAME.SourceTypes | array of string | Optional. Default is "download", "local", "docker". This parameter can limit the option of source types.


### Databases

#### mysql

A MySQL database can be started and used inside a docker container or an existing local installation can be reused.

Example:

```
software: {
  "myownmysql": {
    Source: "mysql",
    Mysql: {
      Schema: "my_new_schema",
      Create: [
        "src/mysql/initial_ddl.sql",
        "src/mysql/initial_data.sql"
     ],
      RootPassword: "root"
    },
    "my_cnf_config": {
      Name: "my.cnf",
      Content: [
        "[mysqld]",
        "collation-server = utf8_unicode_ci",
        "init-connect='SET NAMES utf8'",
        "character-set-server = utf8"
      ],
      AttachIntoDocker: "/etc/mysql/conf.d" 
    },
    AfterStart: [
      ".. bash code after the mysql started.."
    ]
  }
}
```

Config param            | Type | Description
----------------------- | ---- | -----------
software.COMPONENT\_NAME.Source | string | must be "mysql"
software.COMPONENT\_NAME.Mysql | object | optional, defines the mysql specific config
software.COMPONENT\_NAME.Mysql.Schema | string | Creates this schema if it doesn't exist
software.COMPONENT\_NAME.Mysql.Create | array of string | sql files to execute after startup
software.COMPONENT_NAME.Mysql.RootPassword | string | Root password to set
software.COMPONENT\_NAME.CONFIG\_FILE\_NAME | object | optional, defines a config file e.g. my.cnf
software.COMPONENT\_NAME.CONFIG\_FILE\_NAME.Name | string | name of the config file on the file system
software.COMPONENT\_NAME.CONFIG\_FILE\_NAME.Content | array of string | content of the config file
software.COMPONENT\_NAME.CONFIG\_FILE\_NAME.AttachIntoDocker | string | full path and filename where the config file will be mounted inside a docker container
software.COMPONENT\_NAME.AfterStart | array of string | bash code executed after mysql has started

#### couchdb

A CouchDB database can be started and used inside a docker container or an existing local installation can be reused.

Example:

```
software: {
  'mycouchdb': {
    Source: "couchdb",
    CouchDB: {
      Schema: "toldyouso",
      Create: [ "src/couchdb/_design-User-view.json" ]
    }
  }   
}
```

Config param            | Type | Description
----------------------- | ---- | -----------
software.COMPONENT_NAME.Source | string | must be "couchdb"
software.COMPONENT_NAME.CouchDB | object | optional, defines the couchdb specific config
software.COMPONENT_NAME.CouchDB.Schema | string | Creates this schema if it doesn't exist
software.COMPONENT_NAME.CouchDB.Create | array of string | json file imported after startup, usually something like views


### Vagrant

If the Fulgensfile contains a config.Vagrant section, one can start VM (VirtualBox) via Vagrant and there run the output of fulgens.

*Note: Only Debian based systems are supported (dependency to apt-get).*

Example:

```
  config: {
    Vagrant: {
      Box: 'ubuntu/xenial64'
      Install: 'maven openjdk-8-jdk-headless npm docker.io',
      BeforeInstall: [
        'debconf-set-selections <<< 'mysql-server mysql-server/root_password password foobarpass''
      ],
      AfterInstall: [
        'ln -s /usr/bin/nodejs /usr/bin/node',
        'npm install -g jasmine',
      ]
    },
  }
```
Config param            | Type | Description
----------------------- | ---- | -----------
config.Vagrant.Box | string | Vagrant box name, must be Debian based (as it uses apt-get)
config.Vagrant.Install | string | Package name for apt-get, comma separated
config.Vagrant.BeforeInstall | array of string | bash code to execute inside the Vagrant VM before apt-get install gets executed.
config.Vagrant.AfterInstall | array of string | bash code to execute inside the Vagrant VM after VM was created and started.

## A Fulgensfile

A Fulgensfile may have the file extension ".js".

A [json-schema.org](http://json-schema.org) compliant json-schema file can be found [here](fulgensfile-schema.json)

Example:

```
module.exports = {

  config: {
    Name: 'TestProject',
    Vagrant: {
      Box: 'ubuntu/xenial64',
      Install: 'maven openjdk-8-jdk-headless npm docker.io',
      AfterInstall: [
        'ln -s /usr/bin/nodejs /usr/bin/node',
        'npm install -g jasmine',
      ]
    },
  },

  software: {

    <SOFTWARE_NAME>: {
      Source: "mvn",
      Git: "url_to_git_repo",
      Mvn: {
        Dir: "$$TMP$$/my-git-repo",
        Goal: "install"
      },
      Param: {
        Char: 'o',
        VariableName: 'BASH_VAR_NAME',
        Description: 'Use this switch to set BASH_VAR_NAME to YES'
      }
    },
    
    mysqldriver: {
      Source: "mvn",
      Mvn: {
        Dir: "$$TMP$$/lib",
        Goal: "dependency:copy -Dartifact=mysql:mysql-connector-java:8.0.12 -DoutputDirectory=$$TMP$$/lib/"
      },
      Artifact: "$$TMP$$/lib/mysql-connector-java-8.0.12.jar"
    },
    
    <SOFTWARE_NAME>: {
      Source: "mvn",
      Mvn: {
        BuildDependencies: {
          apt: [ "npm" ],
          npm: [ "jasmine" ]
        }
      },
      Artifact: <PATH_TO_BUILD_ARTIFACT>,
      <ANY_CONFIG_FILE>: {
        Name: "my.properties",
        Connections: [ { Source:"<SOFTWARE_NAME>", Var: "couchdb.host" } ],
        Content: [
          "var1=value1",
          "var2=value21"
        ],
        AttachAsEnvVar: ["JAVA_OPTS", "-Dmy.properties=$$SELF_NAME$$"]
      },
      BeforeBuild: "..bash code run before the build..",
      AfterBuild: ".. bash code after the build"
    },

    <SOFTWARE_NAME>: {
      Source: "couchdb",
      CouchDB: {
        Schema: "toldyouso",
        Create: [ "src/couchdb/_design-User-view.json" ]
      }
    }

    <SOFTWARE_NAME>: {
      Source: "mysql",
      Mysql: {
        Schema: "my_new_schema",
        Create: [
          "src/mysql/initial_ddl.sql",
          "src/mysql/initial_data.sql"
	     ],
        RootPassword: "root"
      },
      <ANY_CONFIG_FILE>: {
        Name: "my.cnf",
        Content: [
          "[mysqld]",
          "collation-server = utf8_unicode_ci",
          "init-connect='SET NAMES utf8'",
          "character-set-server = utf8"
        ],
        AttachIntoDocker: "/etc/mysql/conf.d" 
      },
      AfterStart: [
        ".. bash code after the mysql started.."
      ]
    },
    
    <SOFTWARE_NAME>: {
      Source: "tomcat",
      Deploy: "<SOFTWARE_NAME_REF_TO_DEPLOY>",
      Lib: [ "mysqldriver" ],
      SourceTypes: [ "download", "local" ]
    }
  }
}
```


# Internal documantation

## TYPE_SOURCE

  - docker
  - download
  - local source (for buildable software)
  - local installation (for 3rd party software)
  - git

## Phases

In order of execution

Name | Scope | Desc
---- | ----- | ----
HEAD | global | immutable
FUNCTIONS | global | defines n functions
CLEANUP | global | 1 function, components can add cleanUp logic
OPTIONS | global | 1 function, components can text, always provided $SKIP\_BUILD, $CLEAN, $TYPE\_SOURCE
DEPENDENCY_CHECK | global | components can add checks for dependency binaries
CLEAN | global | using $CLEAN, inside-if, components can add cleanUp logic
GLOBALVARIABLES | global | components can global variables
PREPARE | global | created "localrun", Vagrant, Java version init
PREPARE_COMP | per component | just added code (SourceType init)
GET_SOURCE | per component | just added code
PRE_BUILD | per component | just added code
BUILD | per component | just added code
POST_BUILD | per component | just added code
PRE_START | per component | just added code
START | per component | just added code
POST_START | per component | just added code
LEAVE_COMP | per component | just added code
WAIT | global | using $tailCmd, immutable
