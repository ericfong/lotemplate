
var Path = require('path');
var fs = require('fs');
var vm = require('vm');
var _ = require('lodash');
var debug = require('debug')('lotemplate');


var self = module.exports = function(templateName, data) {
    if (!templateName) throw new Error('templateName cannot be '+templateName);

    // map object
    if (typeof templateName != 'string') {
        return _.mapValues(templateName, function(temp) {
            var ret = self(temp, data);
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
            try {
                // context
                _.extend(data, templateFunc.__paths);
                // never JSON to the whole thing
                data.data = data;
                var ret = templateFunc(data);
                if (self.trimOutput && typeof ret == 'string') {
                    ret = ret.trim();
                }
                return ret;
            } catch(e) {
                console.error(templateName);
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
    while ( tDir.length > 0 && !templateSrc) {
        realName = tDir+'/'+tBase;
        realNames.push(realName);

        var filepath = Path.join(self.DIR, realName);
        debug('template try: ', filepath, tDir, realNames);
        if ( fs.existsSync(filepath) ) {
            templateSrc = fs.readFileSync( filepath, 'utf8' );
            sourceFilepath = filepath;
        }

        // length > 2 to prevent '.' and '..'
        if (tDir.length > 2) {
            tDir = Path.dirname(tDir);
        } else {
            tDir = '';
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
                templateFunc = _.template(templateSrc);
            }

            templateFunc.__paths = {};
            templateFunc.__paths.__filename = sourceFilepath;
            templateFunc.__paths.__dirname = Path.dirname(sourceFilepath);
            templateFunc.__paths.__realName = realName;
            templateFunc.__paths.__realDir = Path.dirname(realName);
            templateFunc.__paths.__targetName = templateName;
            templateFunc.__paths.__targetDir = Path.dirname(templateName);

            // render
            if (templateFunc) {
                // context
                _.extend(data, templateFunc.__paths);
                // never JSON to the whole thing
                data.data = data;
                ret = templateFunc(data);
                if (self.trimOutput && typeof ret == 'string') {
                    ret = ret.trim();
                }
            }
        } catch(e) {
            console.error(sourceFilepath);
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
