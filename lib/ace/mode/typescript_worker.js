/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var Mirror = require("../worker/mirror").Mirror;
var DocumentPositionUtil = require('./typescript/documentPosition').DocumentPositionUtil;


var TypeScriptWorker = exports.TypeScriptWorker = function(sender) {
    this.ts = require('./typescript/ts').getTSProject();
    
    Mirror.call(this, sender);
    this.setTimeout(500);
    this.setOptions();
};

oop.inherits(TypeScriptWorker, Mirror);

(function() {
    this.setOptions = function(options) {
        this.options = options || {
            
        };
        this.doc.getValue() && this.deferredUpdate.schedule(100);
    };

    this.changeOptions = function(newOptions) {
        oop.mixin(this.options, newOptions);
        this.doc.getValue() && this.deferredUpdate.schedule(100);
    };
    
    this.compile = function(doc, config, id) {
        var fileName = "temp.ts";
        
        if (config.compilerOptions) {
            this.ts.clanguageServiceHost.setCompilationSettings(config.compilerOptions);
        }
        
        if (this.ts.clanguageServiceHost.hasScript(fileName)) {
            this.ts.clanguageServiceHost.updateScript(fileName, doc);
        } else {
            this.ts.clanguageServiceHost.addScript(fileName, doc);
        }
        var services = this.ts.clanguageService;
        var output = services.getEmitOutput(fileName);
        var jsOutput = output.outputFiles.map(function (o) { return o.text; }).join('\n');
        var errors = services.getSyntacticDiagnostics(fileName);
        var annotations = [];
        var self = this;
        
        errors.forEach(function(error) {
            var pos = DocumentPositionUtil.getPosition(self.doc, error.start);
            annotations.push({
                row: pos.row,
                column: pos.column,
                text: error.messageText,
                minChar: error.start,
                limChar: error.start + error.length,
                type: "error",
                raw: error.messageText
            });
        });
        
        postMessage({
            type: 'call',
            id: id,
            data: {
                errors: annotations,
                output: jsOutput
            }
        });
    };

    this.onUpdate = function() {
        var value = this.doc.getValue();
        value = value.replace(/^#!.*\n/, "\n");
        if (!value) {
            return this.sender.emit("annotate", []);
        }
        
        var fileName = "temp.ts";
        if (this.ts.languageServiceHost.hasScript(fileName)) {
            this.ts.languageServiceHost.updateScript(fileName, this.doc.getValue());
        }
        else {
            this.ts.languageServiceHost.addScript(fileName, this.doc.getValue());
        }
        var services = this.ts.languageService;
        var errors = {
            'error': services.getCompilerOptionsDiagnostics()
                .concat(services.getSyntacticDiagnostics(fileName)),
            'warning': services.getSemanticDiagnostics(fileName)
        };
        
        var annotations = [];
        var self = this;
        for (var type in errors) {
            errors[type].forEach(function(error) {
                var pos = DocumentPositionUtil.getPosition(self.doc, error.start);
                annotations.push({
                    row: pos.row,
                    column: pos.column,
                    text: error.messageText,
                    minChar: error.start,
                    limChar: error.start + error.length,
                    type: type,
                    raw: error.messageText
                });
            });
        }

        this.sender.emit("annotate", annotations);
    };

}).call(TypeScriptWorker.prototype);

});
