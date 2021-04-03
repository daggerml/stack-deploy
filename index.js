// Generated by CoffeeScript 2.5.1
(function() {
  var AWS_VERSIONS, CfnError, CfnTransformer, GetOpts, VERSION, abort, allCmds, assert, defaultOptionsSpec, fn, fs, getopts, inspect, log, optionsSpecs, os, parseArgv, parseAwsVersion, path, quit, setLogLevel, usage, usageCmd, version, yaml,
    indexOf = [].indexOf;

  fs = require('fs');

  os = require('os');

  path = require('path');

  ({inspect} = require('util'));

  GetOpts = require('./lib/GetOpts');

  yaml = require('js-yaml');

  ({
    strict: assert
  } = require('assert'));

  fn = require('./lib/fn');

  log = require('./lib/log');

  CfnError = require('./lib/CfnError');

  CfnTransformer = require('./lib/cfn-transformer');

  ({
    version: VERSION
  } = require('./package.json'));

  AWS_VERSIONS = [1, 2];

  quit = function(msg, status = 0) {
    if (msg) {
      console.log(msg);
    }
    return process.exit(status);
  };

  abort = function(e) {
    var body;
    if (e.code === 'ENOENT') {
      e = new CfnError(e.message);
    }
    body = e instanceof CfnError ? e.body : e.body || e.stack;
    log.error(e.message, {body});
    return process.exit(1);
  };

  process.on('uncaughtException', abort);

  fn.abortOnException(abort, fs, ['writeFileSync', 'readFileSync', 'existsSync']);

  getopts = new GetOpts({
    alias: {
      bucket: 'b',
      config: 'c',
      help: 'h',
      keep: 'k',
      linter: 'l',
      parameters: 'P',
      profile: 'p',
      quiet: 'q',
      region: 'r',
      tags: 't',
      verbose: 'v',
      version: 'V'
    },
    boolean: ['help', 'keep', 'quiet', 'verbose', 'version'],
    string: {
      bucket: '<name>',
      config: '<file>',
      linter: '<command>',
      parameters: '"<key>=<val> ..."',
      profile: '<name>',
      region: '<name>',
      tags: '"<key>=<val> ..."'
    },
    positional: {
      command: null,
      template: '<template-file>',
      stackname: '<stack-name>'
    },
    opt2var: function(opt) {
      switch (opt) {
        case 'profile':
          return 'AWS_PROFILE';
        case 'region':
          return 'AWS_REGION';
        default:
          return `CFN_TOOL_${opt.toUpperCase()}`;
      }
    },
    unknown: function(x) {
      return abort(new CfnError(`unknown option: '${x}'`));
    }
  });

  defaultOptionsSpec = ['help', 'version', 'command'];

  optionsSpecs = {
    deploy: ['bucket', 'config', 'help', 'keep', 'linter', 'parameters', 'profile', 'quiet', 'region', 'tags', 'verbose', 'command', 'template', 'stackname'],
    transform: ['config', 'help', 'linter', 'profile', 'quiet', 'region', 'tags', 'verbose', 'command', 'template'],
    update: ['config', 'help', 'parameters', 'profile', 'quiet', 'region', 'verbose', 'command', 'stackname']
  };

  (function(spec) {
    if (spec) {
      return getopts.configure(spec);
    } else {
      return getopts.configure(defaultOptionsSpec, false);
    }
  })(optionsSpecs[process.argv[2]]);

  allCmds = Object.keys(optionsSpecs);

  usageCmd = function(cmd) {
    var lpad, opts, prog;
    getopts.configure(cmd ? optionsSpecs[cmd] : defaultOptionsSpec);
    prog = path.basename(process.argv[1]);
    lpad = function(x) {
      return `  ${x}`;
    };
    opts = getopts.usage().map(lpad).join("\n");
    return `${prog}${cmd ? ` ${cmd}` : ''}${opts ? `\n${opts}` : ''}`;
  };

  usage = function(cmd, status) {
    var manp, prog, text;
    prog = path.basename(process.argv[1]);
    manp = [prog].concat(cmd ? [cmd] : []).join('-');
    text = cmd ? usageCmd(cmd) : [null].concat(allCmds).map(usageCmd).join("\n\n");
    return quit(`${text}

See the manpage:
* cmd: man ${manp}
* url: http://htmlpreview.github.io/?https://github.com/daggerml/cfn-tool/blob/${VERSION}/man/${manp}.html`, status);
  };

  version = function() {
    return quit(VERSION);
  };

  parseArgv = function(argv) {
    var cmd, opts;
    opts = getopts.parse(argv);
    cmd = opts.command;
    if (cmd) {
      fn.assertOk(indexOf.call(allCmds, cmd) >= 0, `unknown command: '${cmd}'`);
    }
    switch (false) {
      case !opts.help:
        usage(cmd);
        break;
      case !opts.version:
        version();
        break;
      case !!cmd:
        usage(null, 1);
    }
    getopts.validateArgs(opts);
    return opts;
  };

  parseAwsVersion = function(x) {
    var ref;
    return Number(x != null ? (ref = x.match(/^aws-cli\/([0-9]+)\./)) != null ? ref[1] : void 0 : void 0);
  };

  setLogLevel = function(opts) {
    log.level = (function() {
      switch (false) {
        case !opts.verbose:
          return 'verbose';
        case !opts.quiet:
          return 'error';
        default:
          return 'info';
      }
    })();
    return opts;
  };

  module.exports = function() {
    var awsversion, bucketarg, cfg, cfn, e, exec, haveOverride, i, k, len, opts, params, paramsarg, ref, ref1, ref2, ref3, ref4, res, tagsarg, tpl, v, x;
    opts = setLogLevel(parseArgv(process.argv.slice(2)));
    cfn = new CfnTransformer({opts});
    exec = cfn.execShell.bind(cfn);
    cfg = opts.config || (existsSync('.cfn-tool') && '.cfn-tool');
    if (cfg) {
      log.verbose(`using config file: ${cfg}`);
      try {
        getopts.loadConfig(exec, opts, cfg);
      } catch (error) {
        e = error;
        e.message = e.message.split('\n').shift();
        throw e;
      }
      opts = cfn.opts = setLogLevel(parseArgv(process.argv.slice(2)));
    }
    getopts.setVars(opts, {
      clobber: true
    });
    opts.tmpdir = fs.mkdtempSync([os.tmpdir(), 'cfn-tool-'].join('/'));
    process.on('exit', function() {
      if (!opts.keep) {
        return fs.rmdirSync(opts.tmpdir, {
          recursive: true
        });
      }
    });
    log.verbose("configuration options", {
      body: inspect(fn.selectKeys(opts, getopts.allOpts()))
    });
    fn.assertOk(exec('which aws', 'aws CLI tool not found on $PATH'));
    awsversion = parseAwsVersion(exec('aws --version'));
    fn.assertOk(indexOf.call(AWS_VERSIONS, awsversion) >= 0, `unsupported aws CLI tool version: ${awsversion} (supported versions are ${AWS_VERSIONS})`);
    switch (opts.command) {
      case 'transform':
        Object.assign(opts, {
          dovalidate: false,
          dopackage: false,
          bucket: 'example-bucket',
          s3bucket: 'example-bucket'
        });
        fn.assertOk(opts.template, 'template argument required');
        log.verbose('preparing template');
        res = cfn.writeTemplate(opts.template);
        tpl = readFileSync(res.tmpPath).toString('utf-8');
        console.log(tpl.trimRight());
        break;
      case 'deploy':
        Object.assign(opts, {
          dovalidate: true,
          dopackage: true,
          s3bucket: opts.bucket
        });
        fn.assertOk(opts.template, 'template argument required');
        fn.assertOk(opts.stackname, 'stackname argument required');
        log.info('preparing templates');
        res = cfn.writeTemplate(opts.template);
        tpl = readFileSync(res.tmpPath).toString('utf-8');
        if (res.nested.length > 1) {
          if (!opts.bucket) {
            throw new CfnError('bucket required for nested stacks');
          }
          log.info('uploading templates to S3');
          exec(`aws s3 sync --size-only '${cfn.tmpdir}' 's3://${opts.bucket}/'`);
        }
        if (opts.bucket) {
          bucketarg = `--s3-bucket '${opts.bucket}' --s3-prefix aws/`;
        }
        if (opts.parameters) {
          paramsarg = `--parameter-overrides ${opts.parameters}`;
        }
        if (opts.tags) {
          tagsarg = `--tags ${opts.tags}`;
        }
        log.info('deploying stack');
        exec(`aws cloudformation deploy --template-file '${res.tmpPath}' --stack-name '${opts.stackname}' --capabilities CAPABILITY_NAMED_IAM CAPABILITY_IAM CAPABILITY_AUTO_EXPAND ${bucketarg || ''} ${paramsarg || ''} ${tagsarg || ''}`);
        log.info('done -- no errors');
        break;
      case 'update':
        opts.stackname = opts.args[0];
        fn.assertOk(opts.stackname, 'stackname argument required');
        res = JSON.parse(exec(`aws cloudformation describe-stacks --stack-name '${opts.stackname}'`));
        params = res != null ? (ref = res.Stacks) != null ? (ref1 = ref[0]) != null ? (ref2 = ref1.Parameters) != null ? ref2.reduce(function(xs, x) {
          var k;
          k = x.ParameterKey;
          return fn.assoc(xs, k, `ParameterKey=${k},UsePreviousValue=true`);
        }, {}) : void 0 : void 0 : void 0 : void 0;
        fn.assertOk(Object.keys(params).length, `stack '${opts.stackname}' has no parameters`);
        haveOverride = null;
        ref4 = ((ref3 = opts.parameters) != null ? ref3.split(/ +/) : void 0) || [];
        for (i = 0, len = ref4.length; i < len; i++) {
          x = ref4[i];
          [k, v] = fn.split(x, '=', 2);
          fn.assertOk(k && v, `parameter: expected <key>=<value>: got '${x}'`);
          fn.assertOk(params[k], `stack '${opts.stackname}' has no parameter '${k}'`);
          haveOverride = params[k] = `ParameterKey=${k},ParameterValue=${v}`;
        }
        fn.assertOk(haveOverride, 'parameter overrides required');
        paramsarg = objVals(params).join(' ');
        exec(`aws cloudformation update-stack --stack-name ${opts.stackname} --parameters ${paramsarg} --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND ----use-previous-template`);
        log.info('done -- no errors');
    }
    return quit();
  };

}).call(this);

//# sourceMappingURL=index.js.map
