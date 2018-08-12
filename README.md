Fulgens
=======

This software helps with building, deploying and running software locally.

How to use it?
--------------

`./fulgens.js <CONFIG_FILE>` will generate a bash script you can use to build, deploy and run your software locally.


The config file
---------------

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
      Artifact: <PATH_TO_BUILD_ARTIFACT>
    },

    <SOFTWARE_NAME>: {
      Source: "tomcat",
      Connect: <SOFTWARE_NAME_REF_TO_DEPLOY>
    }
  }
}
```

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

BUILD

POST_BUILD

START

<del>POST_START</del>

WAIT

