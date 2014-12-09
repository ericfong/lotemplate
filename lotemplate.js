
var Path = require('path');
var fs = require('fs');
var vm = require('vm');
var _ = require('lodash');
var debug = require('debug')('lotemplate');


var self = module.exports = function(templateName, data, opt) {
    if (!templateName) throw new Error('templateName cannot be '+templateName);
    opt = opt || {};

    // map object
    if (typeof templateName != 'string') {
        return _.mapValues(templateName, function(temp) {
            var ret = self(temp, data, opt);
            if (!ret) {
                throw new Error('Template Not Found: '+temp);
            }
            return ret;
        });
    }



    // cached
    if (templateName in self.compiles) {
        var templateFunc = self.compiles[templateName];
        if (templateFunc) {
            // if (opt.sourceOnly) {
            //     return templateFunc.__source;
            // }
            try {
                // context
                _.extend(data, templateFunc.__templateData);
                // never JSON to the whole thing
                data.data = data;
                var ret = templateFunc(data);
                if (self.trimOutput && typeof ret == 'string') {
                    ret = ret.trim();
                }
                return ret;
            } catch(e) {
                console.error(templateName, e.source);
                throw e
            }
        } else {
            return null;
        }
    }

    // not cached
    var tBase = Path.basename(templateName);
    var tDir = Path.dirname(templateName);
    var templateSrc = null;
    var sourceFilepath = null;
    var realName = null;
    var realNames = [];
    debug('template finding: ', tDir, tBase);
    while ( tDir !== null && !templateSrc) {
        realName = tDir+'/'+tBase;
        realNames.push(realName);

        var filepath = Path.join(self.DIR, realName);
        debug('template try: ', filepath, tDir, realNames);
        if ( fs.existsSync(filepath) ) {
            templateSrc = fs.readFileSync( filepath, 'utf8' );
            sourceFilepath = filepath;
        }

        // length > 2 to prevent '.' and '..'
        if (!tDir) {
            tDir = null;
        } else {
            tDir = Path.dirname(tDir);
        }
    }

    var templateFunc = null;
    var ret = null;

    // Found
    if (templateSrc) {
        try {
            // compile
            if (/\.js$/.test(tBase)) {
                var script = vm.createScript('(function(){'+templateSrc+'})()', filepath);
                templateFunc = function(data){
                    return script.runInNewContext(data);
                }
            } else {
                templateFunc = _.template(templateSrc, null, opt);
            }

            templateFunc.__source = templateSrc;
            templateFunc.__templateData = {};
            templateFunc.__templateData.__options = opt;
            templateFunc.__templateData.__filename = sourceFilepath;
            templateFunc.__templateData.__dirname = Path.dirname(sourceFilepath);
            templateFunc.__templateData.__realName = realName;
            templateFunc.__templateData.__realDir = Path.dirname(realName);
            templateFunc.__templateData.__targetName = templateName;
            templateFunc.__templateData.__targetDir = Path.dirname(templateName);

            // render
            if (templateFunc) {
                // if (opt.sourceOnly) {
                //     ret = templateFunc.__source;
                // } else {
                    // context
                    _.extend(data, templateFunc.__templateData);
                    // never JSON to the whole thing
                    data.data = data;
                    ret = templateFunc(data);
                    if (self.trimOutput && typeof ret == 'string') {
                        ret = ret.trim();
                    }
                // }
            }
        } catch(e) {
            console.error(sourceFilepath, e.source);
            throw e
        }
    }

    // cache
    realNames.forEach(function(tName){
        self.compiles[tName] = templateFunc;
    });
    //debug('template compiles: ', self.compiles);

    // output
    return ret;
}


_.extend(self, {
    DIR: Path.join(__dirname, '../../lotemplate'),
    compiles: {},
    _: _,
    templateSettings: _.templateSettings,
    imports: _.templateSettings.imports,
    trimOutput: true,
})

self.imports.lotemplate = self;
