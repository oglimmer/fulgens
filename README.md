Fulgens
=======

This software helps with building, deploying and running software locally.

How to use it?
--------------

1.) Install it vial the npm registry: `npm -g install fulgens`

2.) Create a Fulgensfile

3.) Exeucte `fulgens` in the same directory as a Fulgensfile and it will generate a bash script you can use to build, deploy and run your software locally


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

    <SOFTWARE_NAME>: {
      Source: "couchdb",
      CouchDB: {
        Schema: "toldyouso",
        Create: [ "src/couchdb/_design-User-view.json" ]
      }
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

HEAD, immutable

FUNCTIONS, just functions

CLEANUP, 1 function, components can add cleanUp logic

OPTIONS, TBD!!@TODO

DEPENDENCY_CHECK, global_code, one_liners

CLEAN

GLOBALVARIABLES

PREPARE

GET_SOURCE

<del>POST_GET_SOURCE</del>

PRE_BUILD

BUILD

POST_BUILD

START

POST_START

WAIT

