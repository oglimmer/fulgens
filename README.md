Fulgens
=======

This software helps with building, deploying and running software locally.

How to use it?
--------------

1.) Install it vial the npm registry: `npm -g install fulgens`

2.) Create a Fulgensfile

3.) Exeucte `fulgens` in the same directory as a Fulgensfile and it will generate a bash script you can use to build, deploy and run your software locally

Supported software
------------------

###Build environments

* maven

Can be used to build locally or within a docker container. When doing a local build the -j JAVA_VERSION setting is respected.

###Runtime environments

* tomcat

To run a web application a fresh Tomcat can be downloaded, extracted and started, it is also possible to start and run a Tomcat instance inside a docker container. Also an existing local Tomcat installation can be reused.

###Databases

* mysql

A MySQL database can be started and used inside a docker container or an existing local installation can be reused.

* couchdb

A CouchDB database can be started and used inside a docker container or an existing local installation can be reused.

###Vagrant

If the Fulgensfile contains a config.Vagrant section, the entire execution can be run inside a VM (VirtualBox) via Vagrant.

A Fulgensfile
-------------

A Fulgensfile may have the file extension ".js".

```
module.exports = {

  config: {
    Name: <NAME_OF_THE_PROJECT>,
    Vagrant: {
      Box: 'ubuntu/xenial64',
      Install: 'maven openjdk-8-jdk-headless npm phantomjs docker.io',
      AddInstall: [
        'ln -s /usr/bin/nodejs /usr/bin/node',
        'npm install -g jasmine phantomjs-prebuilt',
      ]
    },
  },

  software: {
    <SOFTWARE_NAME>: {
      Source: "mvn",
      Mvn: {
        BuildDependencies: {
          apt: [ "npm", "phantomjs" ],
          npm: [ "jasmine", "phantomjs-prebuilt" ]
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

    //NOT SUPPORTED YET
    //<SOFTWARE_NAME>: {
    //  Source: "mvn",
    //  Git: "url_to_git_repo",
    //  Mvn: { Goal: "install" }
    //},

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
        RootPasswort: "root"
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
    }
    <SOFTWARE_NAME>: {
      Source: "tomcat",
      Deploy: <SOFTWARE_NAME_REF_TO_DEPLOY>
    }
  }
}
```

A simple example / Tutorial
---------------------------

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
      Connect: "MyApp"
    }
  }
}
```
Run `fulgens>run_local.sh` to create a bash script. Follow with `chmod 755 run_local.sh` to make it runnable and finally build, deploy and run via `./run_local.sh -f`.

Now browse to [http://localhost:8080/MyApp/]()

Now try `./run_local.sh -f -t tomcat:docker` to run the Tomcat inside a Docker container. Or `./run_local.sh -f -b docker` to build inside Docker, but run on your local machine.

TYPE_SOURCE
-----------

  - docker
  - download
  - local source (for buildable software)
  - local installation (for 3rd party software)
  - git (not impleted)

Phases
------

HEAD, immutable, global

FUNCTIONS, x functions, global

CLEANUP, 1 function, components can add cleanUp logic, global

OPTIONS, 1 function, components can text, global, always provided $SKIP_BUILD, $CLEAN, $TYPE_SOURCE

DEPENDENCY_CHECK, components can add checks, global

CLEAN, using $CLEAN, inside-if, components can add cleanUp logic, global

GLOBALVARIABLES, components can global variables, global

PREPARE, created "localrun", Vagrant, Java version init

  PREPARE_COMP, just added code, per_comp (SourceType init)

  GET_SOURCE, just added code, per_comp

  PRE_BUILD, just added code, per_comp
  BUILD, just added code, per_comp
  POST_BUILD, just added code, per_comp

  PRE_START, just added code, per_comp
  START, just added code, per_comp
  POST_START, just added code, per_comp

  LEAVE_COMP, just added code, per_comp

WAIT, using $tailCmd, immutable, global

