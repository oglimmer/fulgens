
const BufferedBuilder = require('./BufferedBuilder');

class Option {
  constructor(option, longParam, varNameToSet, helpDesc) {
    this.option = option;
    this.longParam = longParam;
    this.varNameToSet = varNameToSet;
    this.helpDesc = helpDesc;
  }
  spaces() {
    return Array(26 - (this.option.length+this.longParam.length)).join(" "); 
  }
}

class OptionDetails {
  constructor(option, detailsArray) {
    this.option = option;
    this.detailsArray = detailsArray;
  }
}

class OptionsBuilder extends BufferedBuilder {

  constructor() {
    super();
    this.data = [];
    this.dataDetails = [];
  }

  add(option, longParam, varNameToSet, helpDesc, detailsArray) {
    if (this.data.find(e => e.option === option)) {
      // only accept an option once
      return;
    }
    this.data.push(new Option(option, longParam, varNameToSet, helpDesc));
    if (detailsArray) {
      this.dataDetails.push(new OptionDetails(option, detailsArray));
    }
  }

  addDetails(option, detailsArray) {
    this.dataDetails.push(new OptionDetails(option, detailsArray));
  }

  buildInternal() {
    return code(this.userConfig.config.Name, this.data, this.dataDetails, this.runtimeConfiguration.tailCmdSource);
  }

}

module.exports = new OptionsBuilder();

const code = (name, data, dataDetails, tailCmdSource) => `

usage="$(basename "$0") - Builds, deploys and run ${name}
where:
  -h                         show this help text
  -s                         skip any build
  -c [all|build]             clean local run directory, when a build is scheduled for execution it also does a full build
  -k [component]             keep comma sperarated list of components running
  -t [component:type:[path|version]] run component inside [docker] container, [download] component (default) or [local] use installed component from path
  -V                         enable Verbose
${data.map(o => `  -${o.option} ${o.longParam}${o.spaces()}${o.helpDesc}`).join('\n')}

Details:
${dataDetails.map(o => o.detailsArray.map(d => ` -${o.option} ${d}`).join('\n')).join('\n')}
"

cd "$(cd "$(dirname "$0")";pwd -P)"
BASE_PWD=$(pwd)

BUILD=local
while getopts ':hsc:k:t:V${data.map(o => `${o.option}${o.longParam?':':''}`).join('')}' option; do
  case "$option" in
    h) echo "$usage"
       exit;;
    s) SKIP_BUILD=YES;;
    c) 
       CLEAN=$OPTARG
       if [ "$CLEAN" != "all" -a "$CLEAN" != "build" ]; then
         echo "Illegal -c parameter" && exit 1
       fi
       ;;
    k) KEEP_RUNNING=$OPTARG;;
    t) TYPE_SOURCE=$OPTARG;;
    V) VERBOSE=YES;;
${data.map(o => `    ${o.option}) ${o.varNameToSet}=${o.longParam?'$OPTARG':'YES'};;`).join('\n')}
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