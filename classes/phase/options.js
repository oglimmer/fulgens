
const BufferedBuilder = require('./BufferedBuilder');


class OptionsBuilder extends BufferedBuilder {

  build() {
    return `\n\n#####${this.constructor.name}\n\n` + code(this.userConfig.config.Name);
  }

}

module.exports = new OptionsBuilder();


const code = name => `
#
# SECTION: HELP / USAGE
#

usage="$(basename "$0") - Builds, deploys and run ${name}
where:
  -h                         show this help text
  -b [local|docker:version]  build locally (default) or within a maven image on docker, the default image is 3-jdk-10
  -s                         skip any build
  -c [all|build]             clean local run directory, when a build is scheduled for execution it also does a full build
  -f                         tail the apache catalina log at the end
  -v                         start VirtualBox via vagrant, install all dependencies, ssh into the VM and run
  -k [component]             keep [all] or comma sperarated list of components running
  -t [component:type:[path|version]] run component inside [docker] container, [download] component (default) or [local] use installed component from path
  -j version                 set/overwrite java_home to a specific version, needs to be in format for java_home 1.8, 9, 10

Tested software versions:
  -b docker:[3-jdk-8|3-jdk-9|3-jdk-10] default 3-jdk-10
  -j any locally installed JDK, version needs to be compatible with /usr/lib/java_home
  -t tomcat:download:[7|8|9], default 9
  -t tomcat:docker:[7|8|9], default 9

Examples:
  -b local                          do a local build, would respect -j
  -b docker:3-jdk-10                do a docker based build, in this case use maven:3-jdk-10 image
  -t tomcat:local:/usr/lib/tomcat   reuse tomcat installation from /usr/lib/tomcat, would not start/stop this tomcat   
  -t tomcat:download:7              download latest version 7 tomcat and run this build within it, would respect -j
  -t tomcat:docker:7                start docker image tomcat:7 and run this build within it
"

#
# SECTION: RESOLVE PARAMETER
#

cd \${0%/*}

BUILD=local
while getopts ':hb:sc:fvk:t:j:' option; do
  case "$option" in
    h) echo "$usage"
       exit;;
    b) BUILD=$OPTARG;;
    s) SKIP_BUILD=YES;;
    c) 
       CLEAN=$OPTARG
       if [ "$CLEAN" != "all" -a "$CLEAN" != "build" ]; then
         echo "Illegal -c parameter" && exit 1
       fi
       ;;
    f) TAIL=YES;;
    v) VAGRANT=YES;;
    k) KEEP_RUNNING=$OPTARG;;
    t) TYPE_SOURCE=$OPTARG;;
    j) JAVA_VERSION=$OPTARG;;
    :) printf "missing argument for -%s\\n" "$OPTARG" >&2
       echo "$usage" >&2
       exit 1;;
   \\?) printf "illegal option: -%s\\n" "$OPTARG" >&2
       echo "$usage" >&2
       exit 1;;
  esac
done
shift $((OPTIND - 1))
TYPE_PARAM="$1"
`;