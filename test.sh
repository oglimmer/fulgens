#!/usr/bin/env bash

rm -rf test

mkdir test
cd test

mvn archetype:generate -DgroupId=de.oglimmer -DartifactId=MyApp -DarchetypeArtifactId=maven-archetype-webapp -DinteractiveMode=false

cd MyApp

cat >Fulgensfile.js <<EOF
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
EOF

if which ajv; then
  echo "validating Fulgensfile.js"
  if [ "$(ajv -s ../../fulgensfile-schema.json -d Fulgensfile.js)" != "Fulgensfile.js valid" ]; then
    echo "Failed to validate Fulgensfile.js"
    exit 1
  fi
fi

../../fulgens.js > run_local.sh
chmod 755 run_local.sh

./run_local.sh -t tomcat:docker &

PID=$!

while ! curl "http://localhost:8080" 1>/dev/null 2>&1; do
  echo "waiting for tomcat"
  Sleep 1
done

Sleep 2

while [ "$(curl -s http://localhost:8080/MyApp/|grep -o 'Hello World')" != "Hello World" ]; do
  echo "waiting for webapp"
  Sleep 1
done

TOMCAT_DOCKER_ID=$(<.tomcatPid)
docker rm -f $TOMCAT_DOCKER_ID
kill $PID

echo "Test successfully completed."
