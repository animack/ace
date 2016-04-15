define(function(require, exports, module) {
	"use strict";

	require('./typescriptServices');
	
	var languageServiceHost = require('./languageServiceHost');
	
	var libts = '';
	
	var TsProject = (function() {
		function TsProject() {
			this.languageServiceHost = languageServiceHost.createLanguageServiceHost('', 'lib.d.ts');
			this.languageServiceHost.setCompilationSettings({
				"emitDecoratorMetadata": true,
				"experimentalDecorators": true,
				"module": "amd",
				"target": "es5"
			});
			this.languageServiceHost.addScript('lib.d.ts', libts);
			this.languageService = typescript.createLanguageService(this.languageServiceHost, typescript.createDocumentRegistry());
			
			//for compilation
			this.clanguageServiceHost = languageServiceHost.createLanguageServiceHost('', 'lib.d.ts');
			this.clanguageServiceHost.setCompilationSettings({
				"emitDecoratorMetadata": true,
				"experimentalDecorators": true,
				"module": "amd",
				"target": "es5"
			});
			this.clanguageServiceHost.addScript('lib.d.ts', libts);
			this.clanguageService = typescript.createLanguageService(this.clanguageServiceHost, typescript.createDocumentRegistry());
		}
		return TsProject;
	})();
	var tsProject = null;
	
	var req = new XMLHttpRequest();
	req.open('GET', '../mode/typescript/lib.d.ts', false);
	req.onreadystatechange = function() {
		if (req.readyState === 4 && req.status === 200) {
			libts = req.responseText;
			
			if (tsProject) {
				tsProject.languageServiceHost.updateScript('lib.d.ts', libts);
				tsProject.clanguageServiceHost.updateScript('lib.d.ts', libts);
			}
			
			return false;
		}
	};
	req.send();
	
	exports.getTSProject = function() {
		return tsProject ? tsProject : tsProject = new TsProject();
	};
});